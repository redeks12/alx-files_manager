import requests

res = requests.post(
    "http://localhost:5000/users",
    headers={"content-type": "application/json"},
    json={"email": "bob@dylan.com", "password": "toto1234!"},
)

res = requests.get(
    "http://localhost:5000/connect",
    headers={
        "content-type": "application/json",
        "Authorization": "Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=",
    },
)

red = res.json()
res = requests.get(
    "http://localhost:5000/users/me",
    headers={
        "X-Token": red.get("token"),
    },
)
print(res.json())

res = requests.get(
    "http://localhost:5000/disconnect",
    headers={
        "X-Token": red.get("token"),
    },
)
print(
    res.status_code,
)
# # # res.raise_for_status()
res = requests.get(
    "http://localhost:5000/users/me",
    headers={
        "X-Token": red.get("token"),
    },
)
print(res.json())
