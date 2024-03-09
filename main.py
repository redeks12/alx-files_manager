import requests

res = requests.post(
    "http://localhost:5000/users",
    headers={"content-type": "application/json"},
    json={"email": "redhd23@gmail.com", "password": "ajjsj"},
)
# res.raise_for_status()
print(res.json())
