import tkinter as tk
from tkinter import ttk

# 🎨 Color Palette
colors = {
    "bg_dark": "#1A1A2E",  # Deep blue-black foundation
    "bg_dark_alt": "#16213E",  # Slightly lighter blue-black for hover
    "bg_light": "#0F3460",  # Navy blue for secondary panels
    "border": "#406882",  # Subtle blue-gray borders
    "text_primary": "#E0E0E0",  # Bright white for main text
    "text_secondary": "#B0B0B0",  # Light gray for secondary text
    "accent": "#4CC9F0",  # Vibrant cyan accent
    "accent_alt": "#F72585",  # Magenta accent for contrast
    "success": "#06D6A0",  # Green for success messages
    "warning": "#FFD166",  # Yellow for warnings
    "danger": "#EF476F",  # Red for errors/danger
    "info": "#118AB2",  # Blue for information
}

# 🔤 Typography scale
fonts = {
    "title": ("Segoe UI", 24, "bold"),  # Main title
    "header": ("Segoe UI", 18, "bold"),  # Section headers
    "subheader": ("Segoe UI", 16, "bold"),  # Sub-section headers
    "body": ("Segoe UI", 14, "normal"),  # Body text
    "small": ("Segoe UI", 12, "normal"),  # Fine print
    "tiny": ("Segoe UI", 10, "normal"),  # Very small text
}

# 💬 Inspirational Security Quotes
security_quotes = [
    "The only system which is truly secure is one which is switched off and unplugged.",
    "Security is not a product, but a process.",
    "Privacy is not something that I'm merely entitled to, it's an absolute prerequisite.",
    "If you think technology can solve your security problems, then you don't understand the problems and you don't understand the technology.",
    "The more you know about security, the more insecure you feel.",
    "Security is always excessive until it's not enough.",
    "The weakest link in the security chain is the human element.",
    "Passwords are like underwear: don't let people see it, change it often, and don't share it with strangers.",
    "Security is a process, not a product.",
    "The best security is the one that's invisible to the user.",
]


def apply_dark_theme(root: tk.Tk):
    style = ttk.Style(root)
    style.theme_use("clam")

    # Configure root window
    root.configure(bg=colors["bg_dark"])

    # Global settings
    style.configure(
        ".",
        background=colors["bg_dark"],
        foreground=colors["text_primary"],
        font=fonts["body"],
        bordercolor=colors["border"],
        relief="flat",
        focusthickness=1,
        focuscolor=colors["accent"],
    )

    # Frame styling
    style.configure("TFrame", background=colors["bg_dark"])
    style.configure("Accent.TFrame", background=colors["bg_light"])

    # Label styling
    style.configure(
        "TLabel", background=colors["bg_dark"], foreground=colors["text_primary"]
    )
    style.configure("Secondary.TLabel", foreground=colors["text_secondary"])

    # Button styling
    style.configure(
        "TButton",
        background=colors["bg_light"],
        foreground=colors["text_primary"],
        padding=8,
    )
    style.map(
        "TButton",
        background=[("active", colors["bg_dark_alt"]), ("!active", colors["bg_light"])],
        foreground=[("active", colors["accent"]), ("!active", colors["text_primary"])],
    )
    style.configure("Accent.TButton", background=colors["accent"], foreground="#FFFFFF")
    style.map(
        "Accent.TButton",
        background=[("active", colors["accent_alt"]), ("!active", colors["accent"])],
    )

    # Entry styling
    style.configure(
        "TEntry",
        fieldbackground=colors["bg_light"],
        foreground=colors["text_primary"],
        bordercolor=colors["border"],
        lightcolor=colors["accent"],
        darkcolor=colors["border"],
        padding=6,
    )
    style.map(
        "TEntry",
        fieldbackground=[
            ("focus", colors["bg_dark_alt"]),
            ("!focus", colors["bg_light"]),
        ],
    )

    # Treeview & Listbox
    style.configure(
        "Treeview",
        background=colors["bg_light"],
        fieldbackground=colors["bg_light"],
        foreground=colors["text_primary"],
        bordercolor=colors["border"],
    )
    style.map("Treeview", background=[("selected", colors["accent"])])

    # Scrollbar styling
    style.element_create("custom.Horizontal.Scrollbar.thumb", "from", "clam")
    style.configure(
        "Horizontal.TScrollbar",
        background=colors["bg_light"],
        troughcolor=colors["bg_dark"],
    )
    style.configure(
        "Vertical.TScrollbar",
        background=colors["bg_light"],
        troughcolor=colors["bg_dark"],
    )

    # Apply additional fonts and styles
    style.configure("Title.TLabel", font=fonts["title"], foreground=colors["accent"])
    style.configure("Header.TLabel", font=fonts["header"])
    style.configure("Subheader.TLabel", font=fonts["subheader"])
    style.configure("Small.TLabel", font=fonts["small"])
    style.configure("Tiny.TLabel", font=fonts["tiny"])

    # Status message styles
    style.configure("Success.TLabel", foreground=colors["success"])
    style.configure("Warning.TLabel", foreground=colors["warning"])
    style.configure("Danger.TLabel", foreground=colors["danger"])
    style.configure("Info.TLabel", foreground=colors["info"])

    # Compound styles
    style.configure(
        "Title.Success.TLabel", font=fonts["title"], foreground=colors["success"]
    )
    style.configure(
        "Header.Success.TLabel", font=fonts["header"], foreground=colors["success"]
    )
    style.configure(
        "Title.Warning.TLabel", font=fonts["title"], foreground=colors["warning"]
    )
    style.configure(
        "Header.Warning.TLabel", font=fonts["header"], foreground=colors["warning"]
    )
    style.configure(
        "Title.Danger.TLabel", font=fonts["title"], foreground=colors["danger"]
    )
    style.configure(
        "Header.Danger.TLabel", font=fonts["header"], foreground=colors["danger"]
    )
    style.configure("Title.Info.TLabel", font=fonts["title"], foreground=colors["info"])
    style.configure(
        "Header.Info.TLabel", font=fonts["header"], foreground=colors["info"]
    )
