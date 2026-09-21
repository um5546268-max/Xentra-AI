import tkinter as tk
from tkinter import messagebox

def check_credentials(username, password):
    # Dummy check: username 'admin', password 'password'
    return username == "admin" and password == "password"

def login():
    user = entry_user.get()
    pwd = entry_pass.get()
    if check_credentials(user, pwd):
        messagebox.showinfo("Login", "Login successful!")
    else:
        messagebox.showerror("Login", "Invalid credentials.")

root = tk.Tk()
root.title("Login")

tk.Label(root, text="Username:").grid(row=0, column=0, padx=10, pady=10)
entry_user = tk.Entry(root)
entry_user.grid(row=0, column=1, padx=10, pady=10)

tk.Label(root, text="Password:").grid(row=1, column=0, padx=10, pady=10)
entry_pass = tk.Entry(root, show="*")
entry_pass.grid(row=1, column=1, padx=10, pady=10)

tk.Button(root, text="Login", command=login).grid(row=2, column=0, columnspan=2, pady=10)

root.mainloop()