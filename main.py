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

import base64

# import requests
import sys

file_path = sys.argv[1]
file_name = file_path.split("/")[-1]

file_encoded = None
with open(file_path, "rb") as image_file:
    file_encoded = base64.b64encode(image_file.read()).decode("utf-8")
    # print(file_encoded)

r_json = {
    "name": file_name,
    "type": "image",
    "isPublic": True,
    "data": file_encoded,
    "parentId": kk.get("_id"),
}
r_headers = {"X-Token": red.get("token")}

r = requests.post("http://localhost:5000/files", json=r_json, headers=r_headers)
print(r.status_code)
print(r.json())
