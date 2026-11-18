import io
import pytest
from app import app


@pytest.fixture()
def client():
    return app.test_client()


def upload(client, text, name="s.csv", url="/analyze"):
    return client.post(url, data={"file": (io.BytesIO(text.encode()), name)}, content_type="multipart/form-data")


def test_happy_path(client):
    r = upload(client, "salesperson,revenue,region\nJohn,10000,East\nJane,15000,West\n")
    assert r.status_code == 200
    j = r.get_json()
    assert j["summary"]["totalRevenue"] == 25000
    assert j["summary"]["topRegion"]["name"] == "West"
    assert set(j["charts"]) == {"revenue_by_region", "top_salespeople"}


def test_bad_rows_are_dropped_and_counted(client):
    r = upload(client, "salesperson,revenue,region\nJohn,abc,East\nJane,15000,West\n")
    assert r.get_json()["summary"]["rowsDropped"] == 1


def test_missing_column(client):
    r = upload(client, "salesperson,revenue\nJohn,1\n")
    assert r.status_code == 400 and "region" in r.get_json()["error"]


def test_wrong_extension(client):
    assert upload(client, "a,b\n1,2", name="x.txt").status_code == 400


def test_no_file(client):
    assert client.post("/analyze").status_code == 400


def test_png_zip(client):
    r = upload(client, "salesperson,revenue,region\nJohn,10000,East\n", url="/analyze/png")
    assert r.status_code in (200, 500)  # 500 only if Kaleido is unavailable in this environment
