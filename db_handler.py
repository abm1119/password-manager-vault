import os, sqlite3, base64, hashlib, json, datetime
from itertools import cycle


class SimpleCipher:
    def __init__(self, master_pwd: str = None, salt: bytes = None, key: bytes = None):
        if key:
             self.key = key
        elif master_pwd and salt:
            self.key = hashlib.pbkdf2_hmac(
                "sha256", master_pwd.encode(), salt, 200_000, dklen=32
            )
        else:
            raise ValueError("Must provide key OR (master_pwd and salt)")

    def encrypt(self, text: str) -> str:
        if not text:
            return ""
        data = text.encode()
        xored = bytes(b ^ k for b, k in zip(data, cycle(self.key)))
        return base64.b64encode(xored).decode()

    def decrypt(self, token: str) -> str:
        if not token:
            return ""
        try:
            data = base64.b64decode(token)
            pt = bytes(b ^ k for b, k in zip(data, cycle(self.key)))
            return pt.decode()
        except:
            return ""


class DatabaseManager:
    def __init__(self, cipher: SimpleCipher):
        self.cipher = cipher
        self.conn = sqlite3.connect("vault.db")
        self._init_db()

    def _init_db(self):
        c = self.conn.cursor()
        # Meta for master password
        c.execute("""CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)""")
        # Folders
        c.execute("""CREATE TABLE IF NOT EXISTS folders (
                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                       name TEXT NOT NULL,
                       sort INTEGER DEFAULT 0
                     )""")
        # Blocks
        c.execute("""CREATE TABLE IF NOT EXISTS blocks (
                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                       folder_id INTEGER NOT NULL,
                       type TEXT NOT NULL,
                       content TEXT NOT NULL,
                       sort INTEGER DEFAULT 0,
                       FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
                     )""")
        self.conn.commit()

    # Folder CRUD + reorder
    def add_folder(self, name: str) -> int:
        cur = self.conn.cursor()
        cur.execute("SELECT COALESCE(MAX(sort),0) FROM folders")
        nxt = cur.fetchone()[0] + 1
        cur.execute("INSERT INTO folders (name,sort) VALUES (?,?)", (name, nxt))
        self.conn.commit()
        return cur.lastrowid

    def fetch_folders(self):
        return self.conn.execute("SELECT id,name FROM folders ORDER BY sort").fetchall()

    def update_folder(self, fid: int, name: str):
        self.conn.execute("UPDATE folders SET name=? WHERE id=?", (name, fid))
        self.conn.commit()

    def delete_folder(self, fid: int):
        self.conn.execute("DELETE FROM folders WHERE id=?", (fid,))
        self.conn.commit()

    def reorder_folder(self, fid: int, new_sort: int):
        self.conn.execute("UPDATE folders SET sort=? WHERE id=?", (new_sort, fid))
        self.conn.commit()

    # Block CRUD + reorder
    def add_block(self, folder_id: int, btype: str, content: dict) -> int:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT COALESCE(MAX(sort),0) FROM blocks WHERE folder_id=?", (folder_id,)
        )
        nxt = cur.fetchone()[0] + 1
        enc = self.cipher.encrypt(json.dumps(content))
        cur.execute(
            "INSERT INTO blocks (folder_id,type,content,sort) VALUES (?,?,?,?)",
            (folder_id, btype, enc, nxt),
        )
        self.conn.commit()
        return cur.lastrowid

    def fetch_blocks(self, folder_id: int):
        rows = self.conn.execute(
            "SELECT id,type,content FROM blocks WHERE folder_id=? ORDER BY sort",
            (folder_id,),
        ).fetchall()
        out = []
        for bid, btype, enc in rows:
            try:
                data = json.loads(self.cipher.decrypt(enc))
            except:
                data = {}
            out.append((bid, btype, data))
        return out

    def update_block(self, bid: int, content: dict):
        enc = self.cipher.encrypt(json.dumps(content))
        self.conn.execute("UPDATE blocks SET content=? WHERE id=?", (enc, bid))
        self.conn.commit()

    def fetch_block(self, bid: int):
        res = self.conn.execute("SELECT id, type, content FROM blocks WHERE id = ?", (bid,))
        row = res.fetchone()
        if row:
            bid, btype, enc_data = row
            data = json.loads(self.cipher.decrypt(enc_data))
            return {'id': bid, 'btype': btype, 'data': data}
        return None

    

    def delete_block(self, bid: int):
        self.conn.execute("DELETE FROM blocks WHERE id=?", (bid,))
        self.conn.commit()

    def reorder_block(self, bid: int, new_sort: int):
        self.conn.execute("UPDATE blocks SET sort=? WHERE id=?", (new_sort, bid))
        self.conn.commit()


# Master password helpers
import base64


def check_master_password(password: str):
    conn = sqlite3.connect("vault.db")
    row = conn.execute("SELECT v FROM meta WHERE k='salt'").fetchone()
    if not row:
        return False, None
    salt = base64.b64decode(row[0])
    cipher = SimpleCipher(password, salt)
    try:
        test = conn.execute("SELECT v FROM meta WHERE k='test'").fetchone()[0]
        if cipher.decrypt(test) == "vault-test":
            return True, cipher
    except:
        pass
    return False, None


def setup_new_vault(password: str):
    conn = sqlite3.connect("vault.db")
    conn.execute("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)")
    salt = os.urandom(16)
    cipher = SimpleCipher(password, salt)
    conn.execute(
        "INSERT INTO meta (k,v) VALUES ('salt',?)", (base64.b64encode(salt).decode(),)
    )
    conn.execute(
        "INSERT INTO meta (k,v) VALUES ('test',?)", (cipher.encrypt("vault-test"),)
    )
    conn.commit()
    return cipher
