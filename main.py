import requests

# res = requests.post(
#     "http://localhost:5000/users",
#     headers={"content-type": "application/json"},
#     json={"email": "bob@dylan.com", "password": "toto1234!"},
# )

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

res = requests.post(
    "http://localhost:5000/files",
    headers={
        "X-Token": red.get("token"),
    },
    json={"name": "mainfile3", "type": "folder"},
)
kk = res.json()
print(kk)
print("//////////////")

res = requests.get(
    "http://localhost:5000/files?parentId=65edebf78a4e3427c4b42f3b",
    headers={"X-token": "80410631-a20a-409d-9eb4-36cde8914eb9"},
)

print(res.json())

res = requests.get(
    "http://localhost:5000/files/65ee013bae63fb22dc43558d",
    headers={"X-token": "80410631-a20a-409d-9eb4-36cde8914eb9"},
)

print(res.json())
