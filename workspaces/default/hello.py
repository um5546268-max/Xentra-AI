# Simple calculator
def calculate(a, b, op):
    if op == '+':
        return a + b
    elif op == '-':
        return a - b
    elif op == '*':
        return a * b
    elif op == '/':
        return a / b if b != 0 else 'Error: Division by zero'
    else:
        return 'Error: Unknown operator'

def main():
    try:
        a = float(input("Enter first number: "))
        op = input("Enter operator (+, -, *, /): ")
        b = float(input("Enter second number: "))
        result = calculate(a, b, op)
        print(f"Result: {result}")
    except ValueError:
        print("Error: Invalid input")

if __name__ == "__main__":
    main()