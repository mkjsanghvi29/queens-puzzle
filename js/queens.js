// Queens Game Logic
document.addEventListener('DOMContentLoaded', function() {
    // Game elements
    const gameBoard = document.getElementById('game-board');
    const gameMessage = document.getElementById('game-message');
    const startButton = document.getElementById('start-game');
    const newGameButton = document.getElementById('new-game');
    const hintButton = document.getElementById('hint');
    const undoButton = document.getElementById('undo');
    const clearButton = document.getElementById('clear');
    const autoPlaceXBox = document.getElementById('auto-place-x');
    const timer = document.getElementById('timer');
    const difficultyButtons = document.querySelectorAll('.difficulty-buttons button');
    const infoButton = document.getElementById('info-button');
    const instructionsModal = document.getElementById('instructions-modal');
    const closeModalButton = document.querySelector('.close-modal');
    
    // Game state
    let currentBoard = [];
    let gameInProgress = false;
    let moveHistory = [];
    let startTime;
    let timerInterval;
    let currentDifficulty = 'easy';
    let boardSize = 5; // Default to easy (5x5)
    let regions = []; // Will store colored regions
    let currentSolver = null; // For verifying puzzle solutions
    
    // Tracking for auto-placed X's
    let autoPlacedX = new Map(); // Maps queen position "row,col" to array of auto-placed X positions
    let manuallyPlacedX = new Set(); // Tracks X's placed manually by the user

    // Helper function to shuffle arrays (needed for random queen placement)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Setup modal interactions
    infoButton.addEventListener('click', function() {
        instructionsModal.classList.add('active');
        instructionsModal.style.display = 'flex'; // Ensure it's visible
    });
    
    closeModalButton.addEventListener('click', function() {
        instructionsModal.classList.remove('active');
        // Use setTimeout to allow animation to complete before hiding
        setTimeout(() => {
            instructionsModal.style.display = 'none';
        }, 300);
    });
    
    // Close modal when clicking outside of content
    instructionsModal.addEventListener('click', function(e) {
        if (e.target === instructionsModal) {
            closeModalButton.click();
        }
    });
    
    // Initialize event listeners
    startButton.addEventListener('click', startGame);
    newGameButton.addEventListener('click', generateNewGame);
    hintButton.addEventListener('click', provideHint);
    undoButton.addEventListener('click', undoMove);
    clearButton.addEventListener('click', clearBoard);
    autoPlaceXBox.addEventListener('change', updateAutoPlaceX);
    
    // Set up difficulty selection
    difficultyButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (gameInProgress) {
                if (!confirm('Changing difficulty will reset the current game. Continue?')) {
                    return;
                }
                endGame();
            }
            
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentDifficulty = this.dataset.difficulty;
            
            switch (currentDifficulty) {
                case 'easy':
                    boardSize = 5;
                    break;
                case 'medium':
                    boardSize = 6;
                    break;
                case 'hard':
                    boardSize = 8;
                    break;
            }
            
            // Immediately start a new game with the selected difficulty
            startGame();
        });
    });
    
    // Initialize the game - auto-start when page loads
    startGame();
    
    // Initialize the game
    function startGame() {
        endGame(); // Clean up any existing game
        gameInProgress = true;
        moveHistory = [];
        
        // Enable game buttons
        hintButton.disabled = false;
        undoButton.disabled = false;
        clearButton.disabled = false;
        startButton.textContent = 'Restart Game';
        
        // Generate a board with randomly created regions
        generateBoard();
        
        // Start the timer
        startTimer();
        
        // Clear message
        gameMessage.textContent = '';
        gameMessage.className = '';
    }
    
    function generateNewGame() {
        if (gameInProgress) {
            if (!confirm('Generate a new game? Your current progress will be lost.')) {
                return;
            }
        }
        
        // Generate a completely new board layout
        startGame();
    }
    
    // Display success message with animation
    function displayMessage(message, type) {
        gameMessage.textContent = message;
        gameMessage.className = type || '';
        
        // Apply animation by resetting it
        gameMessage.style.animation = 'none';
        // Force reflow to make sure animation restarts
        void gameMessage.offsetWidth;
        gameMessage.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    }
    
    // Generate the board with improved visuals
    function generateBoard() {
        // Clear the game board
        gameBoard.innerHTML = '';
        
        // Set grid size based on difficulty
        gameBoard.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
        
        // Add a subtle entrance animation to the board
        gameBoard.style.opacity = '0';
        gameBoard.style.transform = 'perspective(1000px) rotateX(10deg) translateY(20px)';
        
        // Dynamically generate regions with guaranteed solvability
        generateDynamicRegions();
        
        // Create cells
        currentBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
        
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Set background color based on region
                const regionIndex = getRegionIndex(row, col);
                cell.style.backgroundColor = getRegionColor(regionIndex);
                
                // Add click event to toggle cell state
                cell.addEventListener('click', handleCellClick);
                
                // Add staggered animation delay for cells
                cell.style.opacity = '0';
                cell.style.transform = 'scale(0.8)';
                cell.style.transitionDelay = `${(row * boardSize + col) * 10}ms`;
                
                gameBoard.appendChild(cell);
            }
        }
        
        // Trigger animation after a short delay
        setTimeout(() => {
            gameBoard.style.opacity = '1';
            gameBoard.style.transform = 'perspective(1000px) rotateX(2deg) translateY(0)';
            
            // Animate all cells in
            document.querySelectorAll('.cell').forEach(cell => {
                cell.style.opacity = '1';
                cell.style.transform = 'scale(1)';
            });
        }, 100);
    }
    
    function generateDynamicRegions() {
        // Generate random regions and a solution
        const { regionMap, solution } = generateRandomRegions(boardSize);
        regions = regionMap;
        
        // Store the solution for validation and hints
        currentSolver = {
            solution: solution
        };
    }
    
    // Generate a random but solvable region map
    function generateRandomRegions(size) {
        // First, create a valid Queens solution (where no two queens attack each other)
        const solution = generateQueensSolution(size);
        
        // Then create regions around this solution to ensure solvability
        const regionMap = createRegionsAroundSolution(solution, size);
        
        return { regionMap, solution };
    }
    
    // Generate a solution for the Queens puzzle (a valid placement of Queens)
    function generateQueensSolution(size) {
        // Create a valid n-queens solution where no queens can attack each other
        let solution = Array(size).fill().map(() => Array(size).fill(0));
        
        // For the n-queens problem, one valid solution is always to place queens along the main diagonal
        // But we'll use a more randomized approach to create variety
        
        const rows = Array.from({length: size}, (_, i) => i);
        const cols = Array.from({length: size}, (_, i) => i);
        
        // Shuffle the rows for randomization
        shuffleArray(rows);
        
        // Place queens using a simple backtracking algorithm
        if (!placeQueensBacktracking(solution, rows, 0, size)) {
            // If for some reason the backtracking fails (shouldn't happen),
            // fall back to a simple diagonal pattern which always works for n≥4
            for (let i = 0; i < size; i++) {
                solution[i][i] = 1;
            }
        }
        
        return solution;
    }
    
    // Backtracking algorithm to place queens where none attack each other
    function placeQueensBacktracking(board, rows, col, size) {
        // Base case: all queens are placed
        if (col >= size) {
            return true;
        }
        
        // Try placing a queen in each row of the current column
        for (let i = 0; i < size; i++) {
            const row = rows[i];
            
            // Check if this position is safe
            if (isSafeQueenPosition(board, row, col, size)) {
                // Place the queen
                board[row][col] = 1;
                
                // Recursively place rest of the queens
                if (placeQueensBacktracking(board, rows, col + 1, size)) {
                    return true;
                }
                
                // If placing queen doesn't lead to a solution, backtrack
                board[row][col] = 0;
            }
        }
        
        // No solution found
        return false;
    }
    
    // Check if a queen can be placed at board[row][col] without being attacked
    function isSafeQueenPosition(board, row, col, size) {
        // Check the row to the left (we only need to check left since we're placing queens from left to right)
        for (let c = 0; c < col; c++) {
            if (board[row][c] === 1) {
                return false;
            }
        }
        
        // Check upper diagonal on left
        for (let r = row, c = col; r >= 0 && c >= 0; r--, c--) {
            if (board[r][c] === 1) {
                return false;
            }
        }
        
        // Check lower diagonal on left
        for (let r = row, c = col; r < size && c >= 0; r++, c--) {
            if (board[r][c] === 1) {
                return false;
            }
        }
        
        return true;
    }
    
    // Create regions around the solution to make sure each region has exactly one queen
    function createRegionsAroundSolution(solution, size) {
        // Start with each cell in its own region
        let nextRegionId = 0;
        let regionMap = Array(size).fill().map(() => Array(size).fill(0).map(() => nextRegionId++));
        
        // Find all queen positions from the solution
        const queenPositions = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (solution[row][col] === 1) {
                    queenPositions.push({row, col});
                }
            }
        }
        
        // We'll work with cells organized by region
        let regionData = new Map(); // Maps region ID to {cells: [{row, col}], hasQueen: boolean}
        
        // Initialize region data
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const regionId = regionMap[row][col];
                if (!regionData.has(regionId)) {
                    regionData.set(regionId, {
                        cells: [],
                        hasQueen: false
                    });
                }
                
                const data = regionData.get(regionId);
                data.cells.push({row, col});
                data.hasQueen = data.hasQueen || solution[row][col] === 1;
            }
        }
        
        // First, ensure each queen is in its own region
        // This is important for puzzle solvability
        const queenRegions = new Set();
        for (const {row, col} of queenPositions) {
            queenRegions.add(regionMap[row][col]);
        }
        
        // Merge regions in a controlled way, always ensuring each region has exactly one queen
        // We'll use a flood-fill approach to create contiguous regions
        
        // For each queen cell, grow its region by merging adjacent non-queen cells
        for (const {row, col} of queenPositions) {
            const queenRegionId = regionMap[row][col];
            
            // Grow this region with adjacent cells that don't have queens
            let cellsToProcess = [{row, col}];
            const processed = new Set();
            
            // Process each cell in a breadth-first manner to ensure contiguous regions
            while (cellsToProcess.length > 0 && regionData.get(queenRegionId).cells.length < size * 0.8) {
                const cell = cellsToProcess.shift();
                const cellKey = `${cell.row},${cell.col}`;
                
                if (processed.has(cellKey)) continue;
                processed.add(cellKey);
                
                // Try to merge adjacent cells
                growRegionWithAdjacent(regionMap, solution, cell.row, cell.col, size, regionData, queenRegionId, cellsToProcess);
            }
        }
        
        // If any cells remain unmerged with a queen's region, perform a final merging pass
        // to ensure all cells are connected to a region with a queen
        ensureAllCellsHaveQueenRegion(regionMap, solution, size, regionData, queenRegions);
        
        // Renumber regions to be sequential from 0
        const regionIdMap = new Map();
        let newId = 0;
        
        const finalRegionMap = Array(size).fill().map(() => Array(size).fill(0));
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const oldId = regionMap[row][col];
                if (!regionIdMap.has(oldId)) {
                    regionIdMap.set(oldId, newId++);
                }
                finalRegionMap[row][col] = regionIdMap.get(oldId);
            }
        }
        
        // Verify each region has exactly one queen
        const verification = verifyOneQueenPerRegion(finalRegionMap, solution, size);
        
        if (!verification.valid) {
            console.error("Invalid region generation - fixing...");
            // If invalid, fall back to a very simple region generation approach
            // that guarantees one queen per region
            return createSimpleRegions(solution, size);
        }
        
        return finalRegionMap;
    }
    
    // Helper function to grow a region with adjacent cells
    function growRegionWithAdjacent(regionMap, solution, row, col, size, regionData, targetRegionId, cellsToProcess) {
        // Only consider orthogonal neighbors (not diagonal) for more natural-looking regions
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        
        shuffleArray(directions);
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            // Check bounds
            if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
                continue;
            }
            
            const neighborRegionId = regionMap[newRow][newCol];
            
            // Skip if already merged
            if (neighborRegionId === targetRegionId) {
                continue;
            }
            
            const neighborRegion = regionData.get(neighborRegionId);
            
            // Can't merge with a cell that has a queen (each region must have exactly one queen)
            if (neighborRegion.hasQueen) {
                continue;
            }
            
            // Merge this region into the target region
            mergeRegions(regionMap, neighborRegionId, targetRegionId, regionData);
            
            // Add the neighbor to cells to process
            cellsToProcess.push({row: newRow, col: newCol});
        }
    }
    
    // Make sure all cells are part of a region with a queen
    function ensureAllCellsHaveQueenRegion(regionMap, solution, size, regionData, queenRegions) {
        // Find regions without queens
        const regionsWithoutQueen = [];
        
        for (const [regionId, data] of regionData.entries()) {
            if (!data.hasQueen) {
                regionsWithoutQueen.push(regionId);
            }
        }
        
        // For each region without a queen, merge it with an adjacent region that has a queen
        for (const regionId of regionsWithoutQueen) {
            // Skip if this region has already been merged
            if (!regionData.has(regionId)) continue;
            
            // Find a cell in this region
            const region = regionData.get(regionId);
            if (region.cells.length === 0) continue;
            
            const cell = region.cells[0];
            
            // Try to merge with any adjacent region that has a queen
            if (!tryMergeWithAdjacentQueenRegion(regionMap, solution, cell.row, cell.col, size, regionData, queenRegions)) {
                // If no adjacent queen region, merge with any adjacent region
                // (it might be connected to a queen region through another merge)
                tryMergeWithAnyAdjacentRegion(regionMap, solution, cell.row, cell.col, size, regionData);
            }
        }
    }
    
    // Try to merge with an adjacent region that has a queen
    function tryMergeWithAdjacentQueenRegion(regionMap, solution, row, col, size, regionData, queenRegions) {
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        
        shuffleArray(directions);
        
        const currentRegionId = regionMap[row][col];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            // Check bounds
            if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
                continue;
            }
            
            const targetRegionId = regionMap[newRow][newCol];
            
            // Skip if same region
            if (targetRegionId === currentRegionId) {
                continue;
            }
            
            // Check if target region has a queen
            if (queenRegions.has(targetRegionId)) {
                // Perform the merge
                mergeRegions(regionMap, currentRegionId, targetRegionId, regionData);
                return true;
            }
        }
        
        return false;
    }
    
    // Try to merge with any adjacent region
    function tryMergeWithAnyAdjacentRegion(regionMap, solution, row, col, size, regionData) {
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        
        shuffleArray(directions);
        
        const currentRegionId = regionMap[row][col];
        
        // Skip if this region no longer exists (already merged)
        if (!regionData.has(currentRegionId)) return false;
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            // Check bounds
            if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
                continue;
            }
            
            const targetRegionId = regionMap[newRow][newCol];
            
            // Skip if same region
            if (targetRegionId === currentRegionId) {
                continue;
            }
            
            // Skip if this region no longer exists (already merged)
            if (!regionData.has(targetRegionId)) continue;
            
            // Check if merging would put two queens in the same region
            const currentRegion = regionData.get(currentRegionId);
            const targetRegion = regionData.get(targetRegionId);
            
            if (currentRegion.hasQueen && targetRegion.hasQueen) {
                continue; // Can't merge two regions with queens
            }
            
            // Perform the merge
            mergeRegions(regionMap, currentRegionId, targetRegionId, regionData);
            return true;
        }
        
        return false;
    }
    
    // Helper function to merge two regions
    function mergeRegions(regionMap, sourceId, targetId, regionData) {
        // Skip if source no longer exists
        if (!regionData.has(sourceId)) return;
        
        const sourceRegion = regionData.get(sourceId);
        const targetRegion = regionData.get(targetId);
        
        // Update region map
        for (const {row, col} of sourceRegion.cells) {
            regionMap[row][col] = targetId;
        }
        
        // Merge cell lists
        targetRegion.cells = targetRegion.cells.concat(sourceRegion.cells);
        
        // Update hasQueen flag
        targetRegion.hasQueen = targetRegion.hasQueen || sourceRegion.hasQueen;
        
        // Remove the source region
        regionData.delete(sourceId);
    }
    
    // Helper to verify each region has exactly one queen
    function verifyOneQueenPerRegion(regionMap, solution, size) {
        const regionQueens = new Map();
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const regionId = regionMap[row][col];
                
                if (!regionQueens.has(regionId)) {
                    regionQueens.set(regionId, 0);
                }
                
                if (solution[row][col] === 1) {
                    regionQueens.set(regionId, regionQueens.get(regionId) + 1);
                }
            }
        }
        
        let valid = true;
        const invalidRegions = [];
        
        for (const [regionId, queenCount] of regionQueens.entries()) {
            if (queenCount !== 1) {
                valid = false;
                invalidRegions.push({regionId, queenCount});
            }
        }
        
        return {valid, invalidRegions};
    }
    
    // Fallback to simple region generation that guarantees one queen per region
    function createSimpleRegions(solution, size) {
        const regionMap = Array(size).fill().map(() => Array(size).fill(-1));
        let nextRegionId = 0;
        
        // First assign each queen its own region
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (solution[row][col] === 1) {
                    regionMap[row][col] = nextRegionId++;
                }
            }
        }
        
        // Then assign remaining cells
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (regionMap[row][col] === -1) {
                    // Find closest queen (Manhattan distance)
                    let minDist = Infinity;
                    let closestQueen = -1;
                    
                    for (let qRow = 0; qRow < size; qRow++) {
                        for (let qCol = 0; qCol < size; qCol++) {
                            if (solution[qRow][qCol] === 1) {
                                const dist = Math.abs(row - qRow) + Math.abs(col - qCol);
                                if (dist < minDist) {
                                    minDist = dist;
                                    closestQueen = regionMap[qRow][qCol];
                                }
                            }
                        }
                    }
                    
                    regionMap[row][col] = closestQueen;
                }
            }
        }
        
        return regionMap;
    }
    
    function getRegionIndex(row, col) {
        return regions[row][col];
    }
    
    function getRegionColor(index) {
        // Define a set of distinct colors for regions
        const colors = [
            '#f1c40f', // Yellow
            '#e74c3c', // Red
            '#2ecc71', // Green
            '#3498db', // Blue
            '#9b59b6', // Purple
            '#1abc9c', // Teal
            '#f39c12', // Orange
            '#95a5a6'  // Gray
        ];
        
        return colors[index % colors.length];
    }
    
    // Handle cell click with improved feedback
    function handleCellClick(event) {
        if (!gameInProgress) return;
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        // Save the previous state
        saveMove(row, col, currentBoard[row][col]);
        
        // Add immediate visual feedback on click
        event.target.style.transform = 'scale(0.85)';
        setTimeout(() => {
            event.target.style.transform = '';
        }, 150);
        
        // Check for queen removal - need to handle before state changes
        const isRemovingQueen = currentBoard[row][col] === 1;
        const queenKey = `${row},${col}`;
        
        // Toggle cell state: 0 = empty, 1 = queen, 2 = marked (X)
        // Logic: Empty -> Marked (X) -> Queen -> Empty
        switch (currentBoard[row][col]) {
            case 0: // Empty -> Marked (X)
                currentBoard[row][col] = 2;
                event.target.classList.add('marked');
                event.target.classList.remove('queen');
                
                // Track manually placed X
                manuallyPlacedX.add(`${row},${col}`);
                break;
            case 2: // Marked (X) -> Queen
                currentBoard[row][col] = 1;
                event.target.classList.remove('marked');
                event.target.classList.add('queen');
                
                // Remove from manually placed X's if it was there
                manuallyPlacedX.delete(`${row},${col}`);
                break;
            case 1: // Queen -> Empty
                currentBoard[row][col] = 0;
                event.target.classList.remove('queen');
                event.target.classList.remove('marked');
                
                // If we're removing a queen, we'll remove its auto-placed X's
                if (autoPlaceXBox.checked) {
                    removeAutoPlacedXs(row, col);
                }
                break;
        }
        
        // Handle auto-place X's when placing a queen
        if (autoPlaceXBox.checked && currentBoard[row][col] === 1) {
            markAdjacentCells(row, col);
        }
        
        // Always check for win or errors (auto-check always on)
        checkBoard();
    }
    
    function markAdjacentCells(row, col) {
        // Mark all cells that cannot contain a Queen:
        // 1. Cells in the same row
        // 2. Cells in the same column
        // 3. Cells in adjacent positions (including diagonally)
        
        // Mark cells in the same row
        for (let c = 0; c < boardSize; c++) {
            // Skip the cell itself and any already placed queens
            if (c === col || currentBoard[row][c] === 1) continue;
            
            // Mark the cell with X if it's empty
            if (currentBoard[row][c] === 0) {
                currentBoard[row][c] = 2;
                const cell = getCellElement(row, c);
                cell.classList.add('marked');
                
                // Track auto-placed X
                trackAutoPlacedX(row, c, row, col);
            }
        }
        
        // Mark cells in the same column
        for (let r = 0; r < boardSize; r++) {
            // Skip the cell itself and any already placed queens
            if (r === row || currentBoard[r][col] === 1) continue;
            
            // Mark the cell with X if it's empty
            if (currentBoard[r][col] === 0) {
                currentBoard[r][col] = 2;
                const cell = getCellElement(r, col);
                cell.classList.add('marked');
                
                // Track auto-placed X
                trackAutoPlacedX(r, col, row, col);
            }
        }
        
        // Mark adjacent cells (including diagonals)
        for (let r = Math.max(0, row - 1); r <= Math.min(boardSize - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(boardSize - 1, col + 1); c++) {
                // Skip the cell itself, cells in the same row/column (already handled above), and any already placed queens
                if ((r === row && c === col) || (r === row) || (c === col) || currentBoard[r][c] === 1) continue;
                
                // Mark the cell with X if it's empty
                if (currentBoard[r][c] === 0) {
                    currentBoard[r][c] = 2;
                    const cell = getCellElement(r, c);
                    cell.classList.add('marked');
                    
                    // Track auto-placed X
                    trackAutoPlacedX(r, c, row, col);
                }
            }
        }
    }
    
    // Helper to track which X's were placed by a given queen
    function trackAutoPlacedX(xRow, xCol, queenRow, queenCol) {
        const queenKey = `${queenRow},${queenCol}`;
        
        if (!autoPlacedX.has(queenKey)) {
            autoPlacedX.set(queenKey, []);
        }
        
        const positions = autoPlacedX.get(queenKey);
        
        // Add the new position if not already present
        if (!positions.some(pos => pos.row === xRow && pos.col === xCol)) {
            positions.push({row: xRow, col: xCol});
        }
    }
    
    // Remove X's that were auto-placed by a specific queen
    function removeAutoPlacedXs(queenRow, queenCol) {
        const queenKey = `${queenRow},${queenCol}`;
        
        // Check if this queen has any auto-placed X's
        if (autoPlacedX.has(queenKey)) {
            const xsToRemove = autoPlacedX.get(queenKey);
            
            // Remove each X that was placed by this queen
            for (const {row, col} of xsToRemove) {
                const xKey = `${row},${col}`;
                
                // Only remove if:
                // 1. It's still an X (could have been changed)
                // 2. It wasn't manually placed by the user
                if (currentBoard[row][col] === 2 && !manuallyPlacedX.has(xKey)) {
                    currentBoard[row][col] = 0;
                    const cell = getCellElement(row, col);
                    cell.classList.remove('marked');
                }
            }
            
            // Clear the list of X's placed by this queen
            autoPlacedX.delete(queenKey);
        }
    }
    
    // Check board with improved feedback
    function checkBoard() {
        // Remove all error highlights
        document.querySelectorAll('.cell.error').forEach(cell => {
            cell.classList.remove('error');
        });
        
        let hasErrors = false;
        let isComplete = true;
        
        // Check rows, columns, and regions
        hasErrors = checkRows() || checkColumns() || checkRegions();
        isComplete = isBoardFilled();
        
        // Clear previous message if there are no errors and the game is not complete
        if (!hasErrors && !isComplete && gameMessage.textContent) {
            gameMessage.textContent = '';
            gameMessage.className = '';
        }
        
        // Check for win condition
        if (isComplete && !hasErrors) {
            displayMessage('Congratulations! You solved the puzzle!', 'success');
            
            // Add celebration effect to the board
            gameBoard.style.boxShadow = '0 0 30px rgba(46, 204, 113, 0.6)';
            setTimeout(() => {
                gameBoard.style.boxShadow = '';
            }, 3000);
            
            endGame(true);
        } else if (hasErrors) {
            // Only show error message if there are errors
            displayMessage('There are conflicts on the board. Check highlighted cells.', 'error');
        }
    }
    
    function checkRows() {
        let hasErrors = false;
        
        // Check each row
        for (let row = 0; row < boardSize; row++) {
            let queensInRow = 0;
            let queenCols = [];
            
            for (let col = 0; col < boardSize; col++) {
                if (currentBoard[row][col] === 1) {
                    queensInRow++;
                    queenCols.push(col);
                }
            }
            
            // Highlight row errors if more than one queen
            if (queensInRow > 1) {
                hasErrors = true;
                for (let col of queenCols) {
                    getCellElement(row, col).classList.add('error');
                }
            }
        }
        
        return hasErrors;
    }
    
    function checkColumns() {
        let hasErrors = false;
        
        // Check each column
        for (let col = 0; col < boardSize; col++) {
            let queensInCol = 0;
            let queenRows = [];
            
            for (let row = 0; row < boardSize; row++) {
                if (currentBoard[row][col] === 1) {
                    queensInCol++;
                    queenRows.push(row);
                }
            }
            
            // Highlight column errors if more than one queen
            if (queensInCol > 1) {
                hasErrors = true;
                for (let row of queenRows) {
                    getCellElement(row, col).classList.add('error');
                }
            }
        }
        
        return hasErrors;
    }
    
    function checkRegions() {
        let hasErrors = false;
        let regionCounts = Array(boardSize).fill(0);
        let regionQueens = Array(boardSize).fill().map(() => []);
        
        // Count queens in each region
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (currentBoard[row][col] === 1) {
                    const regionIndex = getRegionIndex(row, col);
                    regionCounts[regionIndex]++;
                    regionQueens[regionIndex].push({row, col});
                }
            }
        }
        
        // Check for regions with more than one queen
        for (let i = 0; i < regionCounts.length; i++) {
            if (regionCounts[i] > 1) {
                hasErrors = true;
                // Highlight all queens in this region
                for (let pos of regionQueens[i]) {
                    getCellElement(pos.row, pos.col).classList.add('error');
                }
            }
        }
        
        return hasErrors;
    }
    
    function isBoardFilled() {
        // Check if every row, column, and region has exactly one queen
        
        // Check rows
        for (let row = 0; row < boardSize; row++) {
            let hasQueen = false;
            for (let col = 0; col < boardSize; col++) {
                if (currentBoard[row][col] === 1) {
                    hasQueen = true;
                    break;
                }
            }
            if (!hasQueen) return false;
        }
        
        // Check columns
        for (let col = 0; col < boardSize; col++) {
            let hasQueen = false;
            for (let row = 0; row < boardSize; row++) {
                if (currentBoard[row][col] === 1) {
                    hasQueen = true;
                    break;
                }
            }
            if (!hasQueen) return false;
        }
        
        // Check regions
        let regionHasQueen = Array(boardSize).fill(false);
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (currentBoard[row][col] === 1) {
                    const regionIndex = getRegionIndex(row, col);
                    regionHasQueen[regionIndex] = true;
                }
            }
        }
        
        return regionHasQueen.every(hasQueen => hasQueen);
    }
    
    function saveMove(row, col, previousState) {
        moveHistory.push({row, col, state: previousState});
        undoButton.disabled = false;
    }
    
    function undoMove() {
        if (moveHistory.length === 0) return;
        
        const lastMove = moveHistory.pop();
        const {row, col, state} = lastMove;
        
        // Restore previous state
        currentBoard[row][col] = state;
        const cell = getCellElement(row, col);
        
        // Update cell appearance
        cell.classList.remove('queen', 'marked');
        if (state === 1) {
            cell.classList.add('queen');
        } else if (state === 2) {
            cell.classList.add('marked');
        }
        
        // Disable undo button if no more moves
        if (moveHistory.length === 0) {
            undoButton.disabled = true;
        }
        
        // Re-check board if auto-check is enabled
        checkBoard();
    }
    
    function clearBoard() {
        // Reset all cells to empty
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                currentBoard[row][col] = 0;
                const cell = getCellElement(row, col);
                cell.classList.remove('queen', 'marked', 'error', 'highlight');
            }
        }
        
        // Reset history and disable undo
        moveHistory = [];
        undoButton.disabled = true;
        
        // Clear message
        gameMessage.textContent = '';
        gameMessage.className = '';
    }
    
    // Improved hint with better visual feedback
    function provideHint() {
        // Remove previous hints
        document.querySelectorAll('.cell.highlight').forEach(cell => {
            cell.classList.remove('highlight');
        });
        
        // Check if we have a solver solution
        if (currentSolver && currentSolver.solution) {
            // Find a cell where the player hasn't placed a queen but should
            for (let row = 0; row < boardSize; row++) {
                for (let col = 0; col < boardSize; col++) {
                    if (currentSolver.solution[row][col] === 1 && currentBoard[row][col] !== 1) {
                        getCellElement(row, col).classList.add('highlight');
                        displayMessage('Hint: Try placing a Queen in the highlighted cell', 'hint');
                        return;
                    }
                }
            }
        }
        
        // Fallback to the original hint logic if no direct solution hint
        const hintFound = findRowHint() || findColumnHint() || findRegionHint();
        
        if (!hintFound) {
            // If no specific hint was found, highlight a random empty cell
            const emptyCells = [];
            for (let row = 0; row < boardSize; row++) {
                for (let col = 0; col < boardSize; col++) {
                    if (currentBoard[row][col] === 0) {
                        emptyCells.push({row, col});
                    }
                }
            }
            
            if (emptyCells.length > 0) {
                const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                getCellElement(randomCell.row, randomCell.col).classList.add('highlight');
                displayMessage('Try placing a Queen in the highlighted cell', 'hint');
            }
        }
    }
    
    function findRowHint() {
        for (let row = 0; row < boardSize; row++) {
            // Check if this row has no queens yet
            let hasQueen = false;
            for (let col = 0; col < boardSize; col++) {
                if (currentBoard[row][col] === 1) {
                    hasQueen = true;
                    break;
                }
            }
            
            if (!hasQueen) {
                // Find a valid position in this row
                const validPositions = [];
                for (let col = 0; col < boardSize; col++) {
                    if (currentBoard[row][col] === 0 && isValidPosition(row, col)) {
                        validPositions.push(col);
                    }
                }
                
                if (validPositions.length === 1) {
                    // If there's only one valid position, highlight it
                    const col = validPositions[0];
                    getCellElement(row, col).classList.add('highlight');
                    gameMessage.textContent = `Hint: Place a Queen in row ${row + 1}`;
                    gameMessage.className = 'hint';
                    return true;
                }
            }
        }
        return false;
    }
    
    function findColumnHint() {
        for (let col = 0; col < boardSize; col++) {
            // Check if this column has no queens yet
            let hasQueen = false;
            for (let row = 0; row < boardSize; row++) {
                if (currentBoard[row][col] === 1) {
                    hasQueen = true;
                    break;
                }
            }
            
            if (!hasQueen) {
                // Find a valid position in this column
                const validPositions = [];
                for (let row = 0; row < boardSize; row++) {
                    if (currentBoard[row][col] === 0 && isValidPosition(row, col)) {
                        validPositions.push(row);
                    }
                }
                
                if (validPositions.length === 1) {
                    // If there's only one valid position, highlight it
                    const row = validPositions[0];
                    getCellElement(row, col).classList.add('highlight');
                    gameMessage.textContent = `Hint: Place a Queen in column ${col + 1}`;
                    gameMessage.className = 'hint';
                    return true;
                }
            }
        }
        return false;
    }
    
    function findRegionHint() {
        const uniqueRegions = [...new Set(regions.flat())];
        
        for (let regionIndex of uniqueRegions) {
            // Check if this region has no queens yet
            let hasQueen = false;
            let regionCells = [];
            
            for (let row = 0; row < boardSize; row++) {
                for (let col = 0; col < boardSize; col++) {
                    if (getRegionIndex(row, col) === regionIndex) {
                        regionCells.push({row, col});
                        if (currentBoard[row][col] === 1) {
                            hasQueen = true;
                        }
                    }
                }
            }
            
            if (!hasQueen) {
                // Find a valid position in this region
                const validPositions = [];
                for (let cell of regionCells) {
                    if (currentBoard[cell.row][cell.col] === 0 && isValidPosition(cell.row, cell.col)) {
                        validPositions.push(cell);
                    }
                }
                
                if (validPositions.length === 1) {
                    // If there's only one valid position, highlight it
                    const {row, col} = validPositions[0];
                    getCellElement(row, col).classList.add('highlight');
                    gameMessage.textContent = `Hint: Place a Queen in the highlighted region`;
                    gameMessage.className = 'hint';
                    return true;
                }
            }
        }
        return false;
    }
    
    function isValidPosition(row, col) {
        // Check if this position is valid for a queen
        // (no queens in the same row, column, or region, and no queens in adjacent cells)
        
        // Check row
        for (let c = 0; c < boardSize; c++) {
            if (c !== col && currentBoard[row][c] === 1) return false;
        }
        
        // Check column
        for (let r = 0; r < boardSize; r++) {
            if (r !== row && currentBoard[r][col] === 1) return false;
        }
        
        // Check region
        const regionIndex = getRegionIndex(row, col);
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if ((r !== row || c !== col) && 
                    getRegionIndex(r, c) === regionIndex && 
                    currentBoard[r][c] === 1) {
                    return false;
                }
            }
        }
        
        // Check adjacent cells
        for (let r = Math.max(0, row - 1); r <= Math.min(boardSize - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(boardSize - 1, col + 1); c++) {
                if ((r !== row || c !== col) && currentBoard[r][c] === 1) return false;
            }
        }
        
        return true;
    }
    
    function startTimer() {
        // Clear existing timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Set start time
        startTime = Date.now();
        
        // Update timer every second
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // Update immediately
    }
    
    function updateTimer() {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        timer.textContent = `Time: ${minutes}:${seconds}`;
    }
    
    function getCellElement(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }
    
    function updateAutoPlaceX() {
        // If auto-place X's is turned on, re-evaluate the board
        if (autoPlaceXBox.checked && gameInProgress) {
            // Mark cells adjacent to existing queens
            for (let row = 0; row < boardSize; row++) {
                for (let col = 0; col < boardSize; col++) {
                    if (currentBoard[row][col] === 1) {
                        markAdjacentCells(row, col);
                    }
                }
            }
        }
    }
    
    function endGame(isWin = false) {
        if (!gameInProgress) return;
        
        // Stop the timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Reset game state
        gameInProgress = false;
        
        // Disable game buttons
        hintButton.disabled = true;
        undoButton.disabled = true;
        clearButton.disabled = true;
        
        // Update start button
        startButton.textContent = 'Start Game';
        
        if (!isWin) {
            // Clear any message if not winning
            gameMessage.textContent = '';
            gameMessage.className = '';
        }
    }
});