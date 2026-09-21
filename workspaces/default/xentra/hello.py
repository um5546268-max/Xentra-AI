import time
import os
import sys

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def display_watch():
    try:
        while True:
            clear_screen()
            print("Simple Digital Watch")
            print(time.strftime("%H:%M:%S", time.localtime()))
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nExiting watch.")

if __name__ == "__main__":
    display_watch()