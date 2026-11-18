"""Sales analytics microservice.

POST /analyze          multipart CSV upload (field "file": salesperson,revenue,region)
    ?png=true          additionally return the charts as base64 PNGs (Kaleido)
POST /analyze/png      returns a ZIP containing both charts as PNG files
GET  /health
"""
import base64
import io
import json
import os
import zipfile

import pandas as pd
import plotly.express as px
import plotly.io as pio
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

REQUIRED = ["salesperson", "revenue", "region"]
MAX_BYTES = 5 * 1024 * 1024
MAX_ROWS = 200_000
PALETTE = ["#1D4E89", "#2F7D5B", "#B7791F", "#B3412F", "#5B6B7A", "#7A4E8C"]


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_BYTES
    origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    CORS(app, origins=origins)

    class BadInput(Exception):
        pass

    @app.errorhandler(BadInput)
    def bad_input(e):
        return jsonify(error=str(e)), 400

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify(error=f"File too large (max {MAX_BYTES // (1024 * 1024)} MB)"), 413

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception("unhandled error")
        return jsonify(error="Internal error while analysing the file"), 500

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    def load_dataframe() -> pd.DataFrame:
        f = request.files.get("file")
        if f is None or not f.filename:
            raise BadInput("Attach a CSV file in the 'file' form field")
        if not f.filename.lower().endswith(".csv"):
            raise BadInput("Only .csv files are supported")
        try:
            df = pd.read_csv(f.stream, nrows=MAX_ROWS + 1, skipinitialspace=True)
        except pd.errors.EmptyDataError:
            raise BadInput("The CSV file is empty")
        except (pd.errors.ParserError, UnicodeDecodeError):
            raise BadInput("Could not parse the file as CSV")

        df.columns = [str(c).strip().lower() for c in df.columns]
        missing = [c for c in REQUIRED if c not in df.columns]
        if missing:
            raise BadInput(f"Missing required column(s): {', '.join(missing)}. Expected: {', '.join(REQUIRED)}")
        if len(df) > MAX_ROWS:
            raise BadInput(f"Too many rows (max {MAX_ROWS:,})")

        df = df[REQUIRED].copy()
        df["salesperson"] = df["salesperson"].astype("string").str.strip()
        df["region"] = df["region"].astype("string").str.strip()
        df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce")
        before = len(df)
        df = df.dropna()
        df = df[(df["salesperson"] != "") & (df["region"] != "")]
        df.attrs["dropped"] = before - len(df)
        if df.empty:
            raise BadInput("No valid rows found: revenue must be numeric and salesperson/region must be filled")
        return df

    def build(df: pd.DataFrame):
        by_region = df.groupby("region", as_index=False)["revenue"].sum().sort_values("revenue", ascending=False)
        top = df.groupby("salesperson", as_index=False)["revenue"].sum().sort_values("revenue", ascending=False).head(10)

        fig_region = px.bar(
            by_region, x="region", y="revenue", title="Revenue by region", color="region",
            color_discrete_sequence=PALETTE, text_auto=".3s",
        )
        fig_top = px.bar(
            top.sort_values("revenue"), x="revenue", y="salesperson", orientation="h",
            title="Top salespeople", color_discrete_sequence=[PALETTE[0]], text_auto=".3s",
        )
        for fig in (fig_region, fig_top):
            fig.update_layout(template="plotly_white", showlegend=False, margin=dict(l=60, r=20, t=60, b=50), font=dict(family="system-ui, sans-serif"))
        fig_region.update_yaxes(title="Revenue")
        fig_top.update_xaxes(title="Revenue")
        fig_top.update_yaxes(title=None)

        rev = df["revenue"]
        best_region = by_region.iloc[0]
        best_person = df.groupby("salesperson")["revenue"].sum().sort_values(ascending=False).index[0]
        summary = {
            "rows": int(len(df)),
            "rowsDropped": int(df.attrs.get("dropped", 0)),
            "totalRevenue": float(rev.sum()),
            "averageRevenue": float(rev.mean()),
            "medianRevenue": float(rev.median()),
            "minRevenue": float(rev.min()),
            "maxRevenue": float(rev.max()),
            "stdDev": float(rev.std(ddof=0)),
            "regions": int(df["region"].nunique()),
            "salespeople": int(df["salesperson"].nunique()),
            "topRegion": {"name": str(best_region["region"]), "revenue": float(best_region["revenue"])},
            "topSalesperson": str(best_person),
        }
        return summary, {"revenue_by_region": fig_region, "top_salespeople": fig_top}

    def to_png(fig) -> bytes:
        return pio.to_image(fig, format="png", width=900, height=520, scale=2)

    @app.post("/analyze")
    def analyze():
        df = load_dataframe()
        summary, figs = build(df)
        body = {
            "summary": summary,
            "charts": {name: json.loads(fig.to_json()) for name, fig in figs.items()},
        }
        if request.args.get("png", "").lower() == "true":
            try:
                body["png"] = {name: base64.b64encode(to_png(fig)).decode() for name, fig in figs.items()}
            except Exception:  # Kaleido can be missing/broken in some hosts; the JSON charts are still valid
                app.logger.exception("PNG export failed")
                body["pngError"] = "PNG export is unavailable on this server"
        return jsonify(body)

    @app.post("/analyze/png")
    def analyze_png():
        df = load_dataframe()
        _, figs = build(df)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for name, fig in figs.items():
                z.writestr(f"{name}.png", to_png(fig))
        buf.seek(0)
        return send_file(buf, mimetype="application/zip", as_attachment=True, download_name="sales-charts.zip")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")))
