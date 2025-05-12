# Queens Puzzle Game

A challenging logic puzzle game based on the classic N-Queens problem, presented in an interactive web format. You can access the game at https://mkjsanghvi29.github.io/queens-puzzle/

## How to Play

### Objective
The goal of the Queens Puzzle is to place queens on the game board so that:
- Each row contains exactly one queen
- Each column contains exactly one queen
- Each colored region contains exactly one queen
- No queen can attack another queen

### Game Rules

1. **Queen Placement:** Queens move (and attack) in straight lines horizontally, vertically, and diagonally, just like in chess.

2. **Marking Cells:** You can mark cells with an "X" to indicate where queens cannot be placed.
   - Click on an empty cell once to place an "X"
   - Click on a cell with an "X" to place a queen
   - Click on a queen to remove it

3. **Auto-Mark:** When enabled, placing a queen will automatically mark all cells that cannot contain another queen with an "X".

4. **Victory Condition:** Successfully place queens so that each row, column, and colored region contains exactly one queen, with no queen able to attack another.

### Controls

- **Left Click:** Cycle cell state (Empty → X → Queen → Empty)
- **Drag:** Drag across multiple cells to place X's (or queens/empty cells) efficiently
- **Hint Button:** Highlights a cell that might help solve the puzzle
- **Undo Button:** Removes your last move
- **Clear Button:** Removes all queens and marks from the board
- **Auto-Place X:** Automatically marks cells where queens cannot be placed

## Difficulty Levels

- **Easy:** 5×5 board
- **Medium:** 6×6 board
- **Hard:** 8×8 board

The larger the board, the more challenging the puzzle!

## Tips for Success

1. Start by focusing on rows, columns, or regions with only one possible position for a queen.
2. Use the "Auto-Place X" feature to help identify invalid positions.
3. Remember that queens can attack diagonally across the entire board.
4. If stuck, use the Hint button for guidance.

## About the Queens Puzzle

The Queens Puzzle is based on the classic N-Queens problem in mathematics and computer science, which asks how to place N queens on an N×N chessboard so that no two queens threaten each other. This implementation adds the additional constraint of colored regions, creating a uniquely challenging puzzle experience.

Enjoy the game and exercise your logical thinking skills!
