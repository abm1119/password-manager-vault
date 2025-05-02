import os
import tkinter as tk
from tkinter import ttk, simpledialog, messagebox
import logging

import styles
from db_handler import (
    DatabaseManager,
    check_master_password,
    setup_new_vault,
)

# Setup logging
logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# -------------------- Block Dialogs --------------------
class CredentialDialog(tk.Toplevel):
    def __init__(self, parent, title, data=None):
        super().__init__(parent)
        self.title(title)
        self.transient(parent)
        self.grab_set()
        self.result = None
        # Form fields
        frm = ttk.Frame(self, padding=10)
        frm.pack(fill="both", expand=True)
        # Site
        ttk.Label(frm, text="Site").grid(row=0, column=0, sticky="w")
        self.site = ttk.Entry(frm)
        self.site.grid(row=0, column=1, sticky="ew")
        # Username
        ttk.Label(frm, text="Username").grid(row=1, column=0, sticky="w")
        self.username = ttk.Entry(frm)
        self.username.grid(row=1, column=1, sticky="ew")
        # Email
        ttk.Label(frm, text="Email").grid(row=2, column=0, sticky="w")
        self.email = ttk.Entry(frm)
        self.email.grid(row=2, column=1, sticky="ew")
        # Password
        ttk.Label(frm, text="Password").grid(row=3, column=0, sticky="w")
        self.pw_var = tk.StringVar()
        self.password = ttk.Entry(frm, textvariable=self.pw_var, show="*")
        self.password.grid(row=3, column=1, sticky="ew")
        btn_eye = ttk.Button(frm, text="👁", width=3, command=self.toggle)
        btn_eye.grid(row=3, column=2)
        # Notes
        ttk.Label(frm, text="Notes").grid(row=4, column=0, sticky="w")
        self.notes = tk.Text(frm, height=4)
        self.notes.grid(row=4, column=1, sticky="ew")
        # Custom fields
        self.custom = {}
        ttk.Button(frm, text="+ Custom Field", command=self.add_custom).grid(
            row=5, column=0, columnspan=3
        )
        self.cf_container = ttk.Frame(frm)
        self.cf_container.grid(row=6, column=0, columnspan=3, sticky="ew")
        # Buttons
        btn_frm = ttk.Frame(self)
        btn_frm.pack(fill="x")
        ttk.Button(btn_frm, text="Cancel", command=self.destroy).pack(side="left")
        ttk.Button(btn_frm, text="Save", command=self.save).pack(side="right")
        # Populate
        if data:
            self.site.insert(0, data.get("site", ""))
            self.username.insert(0, data.get("username", ""))
            self.email.insert(0, data.get("email", ""))
            self.pw_var.set(data.get("password", ""))
            self.notes.insert("1.0", data.get("notes", ""))
            for k, v in data.get("custom", {}).items():
                self.add_custom(k, v)
        frm.columnconfigure(1, weight=1)
        self.wait_window()

    def toggle(self):
        show = self.password.cget("show")
        self.password.config(show="" if show == "*" else "*")

    def add_custom(self, key="", val=""):
        row = len(self.custom)
        k_var = tk.StringVar(value=key)
        v_var = tk.StringVar(value=val)
        e_key = ttk.Entry(self.cf_container, textvariable=k_var)
        e_key.grid(row=row, column=0, sticky="ew", pady=2)
        e_val = ttk.Entry(self.cf_container, textvariable=v_var)
        e_val.grid(row=row, column=1, sticky="ew", pady=2)
        btn = ttk.Button(
            self.cf_container,
            text="✕",
            width=2,
            command=lambda r=row: self.remove_custom(r),
        )
        btn.grid(row=row, column=2)
        self.custom[row] = (k_var, v_var, e_key, e_val, btn)

    def remove_custom(self, row):
        k_var, v_var, e_key, e_val, btn = self.custom.pop(row)
        e_key.destroy()
        e_val.destroy()
        btn.destroy()

    def save(self):
        data = {
            "site": self.site.get(),
            "username": self.username.get(),
            "email": self.email.get(),
            "password": self.pw_var.get(),
            "notes": self.notes.get("1.0", "end").strip(),
            "custom": {},
        }
        for k_var, v_var, *_ in self.custom.values():
            k = k_var.get().strip()
            v = v_var.get()
            if k:
                data["custom"][k] = v
        if not data["site"] or not data["password"]:
            messagebox.showerror("Error", "Site and Password required")
            return
        self.result = data
        self.destroy()


class TextDialog(tk.Toplevel):
    def __init__(self, parent, title, text=""):
        super().__init__(parent)
        self.title(title)
        self.transient(parent)
        self.grab_set()
        self.result = None
        txt = tk.Text(self, wrap="word")
        txt.insert("1.0", text)
        txt.pack(fill="both", expand=True)
        btnf = ttk.Frame(self)
        btnf.pack(fill="x")
        ttk.Button(btnf, text="Cancel", command=self.destroy).pack(side="left")
        ttk.Button(btnf, text="Save", command=lambda: self.save(txt)).pack(side="right")
        self.wait_window()

    def save(self, txt):
        self.result = txt.get("1.0", "end").strip()
        self.destroy()


class TableDialog(tk.Toplevel):
    def __init__(self, parent, title, data=None):
        super().__init__(parent)
        self.title(title)
        self.transient(parent)
        self.grab_set()
        self.result = None  # Initialize result attribute
        self.cells = []
        frm = ttk.Frame(self)
        frm.pack(padx=10, pady=10)
        ttk.Button(frm, text="+ Row", command=self.add_row).grid(row=0, column=0)
        self.tbl = ttk.Frame(frm)
        self.tbl.grid(row=1, column=0)
        if data:
            for k, v in data:
                self.add_row(k, v)
        else:
            self.add_row("", "")
        btnf = ttk.Frame(self)
        btnf.pack(fill="x")
        ttk.Button(btnf, text="Cancel", command=self.destroy).pack(side="left")
        ttk.Button(btnf, text="Save", command=self.save).pack(side="right")
        self.wait_window()

    def add_row(self, key="", val=""):
        r = len(self.cells)
        e1 = ttk.Entry(self.tbl)
        e1.grid(row=r, column=0)
        e2 = ttk.Entry(self.tbl)
        e2.grid(row=r, column=1)
        btn = ttk.Button(self.tbl, text="✕", command=lambda rr=r: self.del_row(rr))
        btn.grid(row=r, column=2)
        e1.insert(0, key)
        e2.insert(0, val)
        self.cells.append((e1, e2, btn))

    def del_row(self, row):
        e1, e2, btn = self.cells.pop(row)
        e1.destroy()
        e2.destroy()
        btn.destroy()

    def save(self):
        self.result = [
            (e1.get(), e2.get()) for e1, e2, _ in self.cells if e1.get().strip()
        ]
        self.destroy()


# -------------------- Main Application --------------------
class NotionVaultApp(tk.Tk):
    def __init__(self, cipher):
        super().__init__()
        self.title("🔐 NotionVault")
        self.geometry("1024x640")
        styles.apply_dark_theme(self)
        self.db = DatabaseManager(cipher)
        self._build_ui()
        self.load_folders()
        logging.info("Application started.")

    def _build_ui(self):
        self.sidebar = ttk.Frame(self, width=240)
        self.sidebar.pack(side="left", fill="y")
        self.folder_lv = tk.Listbox(self.sidebar)
        self.folder_lv.pack(fill="both", expand=True, padx=5, pady=5)
        self.folder_lv.bind("<<ListboxSelect>>", self.on_folder)
        btnf = ttk.Frame(self.sidebar)
        btnf.pack(fill="x", pady=2)
        ttk.Button(btnf, text="+", width=2, command=self.add_folder).pack(side="left")
        ttk.Button(btnf, text="✎", width=2, command=self.rename_folder).pack(
            side="left"
        )
        ttk.Button(btnf, text="✕", width=2, command=self.delete_folder).pack(
            side="left"
        )
        ttk.Button(btnf, text="▲", width=2, command=lambda: self.move_folder(-1)).pack(
            side="left"
        )
        ttk.Button(btnf, text="▼", width=2, command=lambda: self.move_folder(1)).pack(
            side="left"
        )
        right = ttk.Frame(self)
        right.pack(side="right", expand=True, fill="both")
        toolbar = ttk.Frame(right)
        toolbar.pack(fill="x")
        # Add new block types to toolbar
        for b in [
            "Credential",
            "Text",
            "Table",
            "Heading",
            "Title",
            "Paragraph",
            "Quote",
        ]:
            ttk.Button(
                toolbar, text=f"+ {b}", command=lambda t=b: self.add_block(t)
            ).pack(side="left", padx=4)
        self.search_var = tk.StringVar()
        ttk.Entry(toolbar, textvariable=self.search_var, width=20).pack(
            side="right", padx=4
        )
        ttk.Button(toolbar, text="Search", command=self.search).pack(side="right")
        self.canvas = tk.Canvas(
            right, bg=styles.colors["bg_dark"], highlightthickness=0
        )
        self.scroll = ttk.Scrollbar(right, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.scroll.set)
        self.scroll.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)
        self.block_frame = ttk.Frame(self.canvas)
        self.canvas.create_window((0, 0), window=self.block_frame, anchor="nw")
        self.block_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")),
        )

    def load_folders(self):
        self.folder_lv.delete(0, "end")
        self.folders = self.db.fetch_folders()
        for _, name in self.folders:
            self.folder_lv.insert("end", name)
        if self.folders:
            self.folder_lv.select_set(0)
            self.on_folder()

    def on_folder(self, _=None):
        sel = self.folder_lv.curselection()
        if not sel:
            return
        idx = sel[0]
        self.current_folder = self.folders[idx][0]
        self.load_blocks()

    def add_folder(self):
        name = simpledialog.askstring("New Folder", "Name:")
        if name:
            self.db.add_folder(name)
            logging.info(f"Folder added: {name}")
            self.load_folders()

    def rename_folder(self):
        sel = self.folder_lv.curselection()
        if not sel:
            return
        idx = sel[0]
        fid, name = self.folders[idx]
        new = simpledialog.askstring("Rename", "New name:", initialvalue=name)
        if new:
            self.db.update_folder(fid, new)
            logging.info(f"Folder renamed: {name} -> {new}")
            self.load_folders()

    def delete_folder(self):
        sel = self.folder_lv.curselection()
        if not sel:
            return
        idx = sel[0]
        fid, name = self.folders[idx]
        if messagebox.askyesno("Delete", "Confirm deletion?"):
            self.db.delete_folder(fid)
            logging.info(f"Folder deleted: {name}")
            self.load_folders()

    def move_folder(self, delta):
        sel = self.folder_lv.curselection()
        if not sel:
            return
        idx = sel[0]
        fid, _ = self.folders[idx]
        new_idx = max(0, min(len(self.folders) - 1, idx + delta))
        other_id = self.folders[new_idx][0]
        self.db.reorder_folder(fid, other_id)
        self.load_folders()
        self.folder_lv.select_set(new_idx)

    def load_blocks(self):
        for w in self.block_frame.winfo_children():
            w.destroy()
        blocks = self.db.fetch_blocks(self.current_folder)
        for bid, btype, data in blocks:
            self._create_block_widget(bid, btype, data)

    def _create_block_widget(self, bid, btype, data):
        lf = ttk.Labelframe(self.block_frame, text=btype, padding=5)
        lf.pack(fill="x", padx=5, pady=5)
        # Enhanced display for new block types
        if btype == "Credential":
            ttk.Label(lf, text=f"Site: {data['site']}").pack(anchor="w")
        elif btype == "Text":
            txt = data[:50] + "..." if len(data) > 50 else data
            ttk.Label(lf, text=txt).pack(anchor="w")
        elif btype == "Table":
            txt = ", ".join(fragment for fragment in (f"{k}:{v}" for k, v in data))
            ttk.Label(lf, text=txt).pack(anchor="w")
        elif btype == "Heading":
            ttk.Label(lf, text=data, font=("Segoe UI", 18, "bold")).pack(
                anchor="w", pady=4
            )
        elif btype == "Title":
            ttk.Label(lf, text=data, font=("Segoe UI", 14, "bold")).pack(
                anchor="w", pady=2
            )
        elif btype == "Paragraph":
            ttk.Label(lf, text=data, font=("Segoe UI", 11)).pack(anchor="w", pady=2)
        elif btype == "Quote":
            ttk.Label(
                lf, text=f"“{data}”", font=("Segoe UI", 11, "italic"), foreground="#888"
            ).pack(anchor="w", padx=10, pady=2)
        frm = ttk.Frame(lf)
        frm.pack(anchor="e")
        ttk.Button(
            frm, text="✎", width=2, command=lambda: self.edit_block(bid, btype, data)
        ).pack(side="left")
        ttk.Button(frm, text="✕", width=2, command=lambda: self.delete_block(bid)).pack(
            side="left"
        )
        ttk.Button(
            frm, text="▲", width=2, command=lambda: self.move_block(bid, -1)
        ).pack(side="left")
        ttk.Button(
            frm, text="▼", width=2, command=lambda: self.move_block(bid, 1)
        ).pack(side="left")

    def add_block(self, btype):
        dlg = None
        try:
            if btype == "Credential":
                dlg = CredentialDialog(self, "Add Credential")
            elif btype == "Text":
                dlg = TextDialog(self, "Add Text")
            elif btype == "Table":
                dlg = TableDialog(self, "Add Table")
            elif btype in ["Heading", "Title", "Paragraph", "Quote"]:
                dlg = TextDialog(self, f"Add {btype}")
            else:
                messagebox.showerror("Error", f"Unknown block type: {btype}")
                return
        except Exception as e:
            logging.error(f"Dialog error for block type {btype}: {e}")
            messagebox.showerror("Dialog Error", str(e))
            return
        if hasattr(dlg, "result") and dlg.result is not None:
            # For new text block types, store as dict with type and text
            if btype in ["Heading", "Title", "Paragraph", "Quote"]:
                self.db.add_block(self.current_folder, btype, dlg.result)
            else:
                self.db.add_block(self.current_folder, btype, dlg.result)
            logging.info(f"Block added: {btype}")
            self.load_blocks()

    def edit_block(self, bid, btype, data):
        dlg = None
        if btype == "Credential":
            dlg = CredentialDialog(self, "Edit Credential", data)
        elif btype == "Text":
            dlg = TextDialog(self, "Edit Text", data)
        else:
            dlg = TableDialog(self, "Edit Table", data)
        if hasattr(dlg, "result") and dlg.result is not None:
            self.db.update_block(bid, dlg.result)
            self.load_blocks()

    def delete_block(self, bid):
        if messagebox.askyesno("Delete", "Confirm deletion?"):
            self.db.delete_block(bid)
            logging.info(f"Block deleted: {bid}")
            self.load_blocks()

    def move_block(self, bid, delta):
        blocks = self.db.fetch_blocks(self.current_folder)
        ids = [b[0] for b in blocks]
        idx = ids.index(bid)
        new_idx = max(0, min(len(ids) - 1, idx + delta))
        swap_id = ids[new_idx]
        self.db.reorder_block(swap_id, blocks[idx][0])
        self.db.reorder_block(bid, blocks[new_idx][0])
        self.load_blocks()

    def search(self):
        kw = self.search_var.get().lower()
        for w in self.block_frame.winfo_children():
            w.destroy()
        for bid, btype, data in self.db.fetch_blocks(self.current_folder):
            text = ""
            if btype == "Credential":
                text = data["site"] + data["username"]
            elif btype == "Text":
                text = data
            else:
                text = " ".join(k + v for k, v in data)
            if kw in text.lower():
                self._create_block_widget(bid, btype, data)


# -------------------- Entry Point --------------------
def main():
    root = tk.Tk()
    root.withdraw()
    if os.path.exists("vault.db"):
        while True:
            pwd = simpledialog.askstring(
                "Master Password", "Enter:", show="*", parent=root
            )
            ok, cipher = check_master_password(pwd or "")
            if ok:
                break
            messagebox.showerror("Error", "Incorrect", parent=root)
        root.destroy()
    else:
        while True:
            p1 = simpledialog.askstring("New Master", "Enter:", show="*", parent=root)
            if not p1 or len(p1) < 8:
                messagebox.showerror("Error", "Min 8 chars", parent=root)
                continue
            p2 = simpledialog.askstring("Confirm", "Re-enter:", show="*", parent=root)
            if p1 == p2:
                cipher = setup_new_vault(p1)
                break
            messagebox.showerror("Error", "Mismatch", parent=root)
        root.destroy()
    try:
        app = NotionVaultApp(cipher)
        app.mainloop()
    except Exception as e:
        logging.exception(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
