import pygame
import random
import sys

pygame.init()
screen = pygame.display.set_mode((640, 480))
pygame.display.set_caption("Number Guessing Puzzle")
font = pygame.font.SysFont(None, 36)
clock = pygame.time.Clock()

target = random.randint(1, 100)
guess_input = ""
feedback = "Guess a number between 1 and 100."
running = True

def render_text(text, color=(255, 255, 255)):
    return font.render(text, True, color)

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RETURN:
                if guess_input.isdigit():
                    guess = int(guess_input)
                    if guess < target:
                        feedback = "Too low!"
                    elif guess > target:
                        feedback = "Too high!"
                    else:
                        feedback = f"Correct! The number was {target}."
                else:
                    feedback = "Please enter a valid number."
                guess_input = ""
            elif event.key == pygame.K_BACKSPACE:
                guess_input = guess_input[:-1]
            else:
                if event.unicode.isdigit():
                    guess_input += event.unicode

    screen.fill((15, 23, 42))
    # Draw instructions
    instr_surf = render_text("Type your guess and press Enter:")
    screen.blit(instr_surf, (20, 100))
    # Draw current input
    input_surf = render_text(guess_input)
    screen.blit(input_surf, (20, 150))
    # Draw feedback
    feedback_surf = render_text(feedback)
    screen.blit(feedback_surf, (20, 200))

    pygame.display.flip()
    clock.tick(60)

pygame.quit()
sys.exit()