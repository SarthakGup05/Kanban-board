
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addBoardBtn = document.getElementById('addBoardBtn');
    const taskFormModal = document.getElementById('taskFormModal');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const taskForm = document.getElementById('taskForm');
    const boardSelector = document.getElementById('boardSelector');
    const boardTitle = document.querySelector('.board-title');
    const todoColumn = document.getElementById('todoColumn');
    const progressColumn = document.getElementById('progressColumn');
    const doneColumn = document.getElementById('doneColumn');
    
    // State management
    let currentTaskId = 1;
    let currentBoard = 'main';
    let editingTaskId = null;
    
    // Local storage keys
    const STORAGE_KEY_PREFIX = 'kanban_';
    
    // Initialize the board
    initializeBoard();
    

    
    // Board selector change
    boardSelector.addEventListener('change', function() {
        currentBoard = this.value;
        boardTitle.textContent = `${this.options[this.selectedIndex].text}`;
        loadBoardData();
    });
    
    // Open task form modal
    addTaskBtn.addEventListener('click', function() {
        openTaskForm('Add New Task');
    });
    
    // Add new board
    addBoardBtn.addEventListener('click', function() {
        const boardName = prompt('Enter a name for the new board:');
        if (boardName && boardName.trim() !== '') {
            const boardValue = boardName.toLowerCase().replace(/\s+/g, '-');
            
            // Check if board already exists
            for (let i = 0; i < boardSelector.options.length; i++) {
                if (boardSelector.options[i].value === boardValue) {
                    alert('A board with this name already exists!');
                    return;
                }
            }
            
            // Add new option to select
            const option = document.createElement('option');
            option.value = boardValue;
            option.textContent = boardName;
            boardSelector.appendChild(option);
            
            // Select the new board
            boardSelector.value = boardValue;
            currentBoard = boardValue;
            boardTitle.textContent = boardName;
            
            // Create empty board data
            saveBoardData({
                todo: [],
                progress: [],
                done: []
            });
            
            loadBoardData();
        }
    });
    
    // Close task form modal
    closeFormBtn.addEventListener('click', closeTaskForm);
    cancelBtn.addEventListener('click', closeTaskForm);
    
    // Close modal when clicking outside
    taskFormModal.addEventListener('click', function(e) {
        if (e.target === taskFormModal) {
            closeTaskForm();
        }
    });
    
    // Form submission
    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const dueDate = document.getElementById('dueDate').value;
        const priority = document.getElementById('priority').value;
        const status = document.getElementById('status').value;
        
        // Get current board data
        const boardData = getBoardData();
        
        if (editingTaskId) {
            // Find and update existing task
            let taskFound = false;
            
            // Check each column
            ['todo', 'progress', 'done'].forEach(column => {
                const columnTasks = boardData[column];
                const taskIndex = columnTasks.findIndex(task => task.id === editingTaskId);
                
                if (taskIndex !== -1) {
                    // Remove task from its current column
                    columnTasks.splice(taskIndex, 1);
                    taskFound = true;
                }
            });
            
            if (taskFound) {
                // Add updated task to selected column
                boardData[status].push({
                    id: editingTaskId,
                    title,
                    description,
                    dueDate,
                    priority,
                    createdAt: new Date().toISOString()
                });
            }
        } else {
            // Create new task
            boardData[status].push({
                id: currentTaskId++,
                title,
                description,
                dueDate,
                priority,
                createdAt: new Date().toISOString()
            });
        }
        
        // Save board data
        saveBoardData(boardData);
        
        // Reload board
        loadBoardData();
        
        // Reset form and close modal
        taskForm.reset();
        closeTaskForm();
    });
    
    // Setup drag and drop functionality
    setupDragAndDrop();
    
    // ===== FUNCTIONS =====
    
    function initializeBoard() {
        // Check if we have any boards in local storage
        const boards = getSavedBoards();
        
        if (boards.length === 0) {
            // Initialize with default data
            const defaultData = {
                todo: [
                    {
                        id: currentTaskId++,
                        title: 'Design homepage mockup',
                        description: 'Create wireframes and visual design for the new homepage.',
                        dueDate: '2025-03-10',
                        priority: 'high',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: currentTaskId++,
                        title: 'Research competitors',
                        description: 'Analyze top 5 competitor websites and features.',
                        dueDate: '2025-03-15',
                        priority: 'medium',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: currentTaskId++,
                        title: 'Write user stories',
                        description: 'Define user stories for the next sprint.',
                        dueDate: '2025-03-08',
                        priority: 'low',
                        createdAt: new Date().toISOString()
                    }
                ],
                progress: [
                    {
                        id: currentTaskId++,
                        title: 'Implement login functionality',
                        description: 'Create authentication API and frontend components.',
                        dueDate: '2025-03-05',
                        priority: 'high',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: currentTaskId++,
                        title: 'Create database schema',
                        description: 'Design and implement the initial database structure.',
                        dueDate: '2025-03-07',
                        priority: 'medium',
                        createdAt: new Date().toISOString()
                    }
                ],
                done: [
                    {
                        id: currentTaskId++,
                        title: 'Project kickoff meeting',
                        description: 'Initial meeting with stakeholders to define project scope.',
                        dueDate: '2025-03-01',
                        priority: 'medium',
                        createdAt: new Date().toISOString()
                    }
                ]
            };
            
            saveBoardData(defaultData);
            
            // Add our default boards to the selector
            addBoardOption('Main Board', 'main');
            addBoardOption('Development', 'development');
            addBoardOption('Marketing', 'marketing');
        } else {
            // Load existing boards into selector
            boards.forEach(board => {
                const nameMatch = board.match(new RegExp(`^${STORAGE_KEY_PREFIX}(.+)$`));
                if (nameMatch && nameMatch[1]) {
                    const boardId = nameMatch[1];
                    const boardName = formatBoardName(boardId);
                    addBoardOption(boardName, boardId);
                }
            });
        }
        
        // Set initial board data
        loadBoardData();
    }
    
    function getSavedBoards() {
        const boards = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                boards.push(key);
            }
        }
        return boards;
    }
    
    function formatBoardName(boardId) {
        return boardId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    function addBoardOption(name, value) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        boardSelector.appendChild(option);
    }
    
    function getBoardData() {
        const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${currentBoard}`);
        return data ? JSON.parse(data) : { todo: [], progress: [], done: [] };
    }
    
    function saveBoardData(data) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${currentBoard}`, JSON.stringify(data));
    }
    
    function loadBoardData() {
        const data = getBoardData();
        
        // Clear columns
        todoColumn.innerHTML = '';
        progressColumn.innerHTML = '';
        doneColumn.innerHTML = '';
        
        // Populate columns
        renderTasks(todoColumn, data.todo);
        renderTasks(progressColumn, data.progress);
        renderTasks(doneColumn, data.done);
        
        // Update column counts
        updateColumnCount('todo-header', data.todo.length);
        updateColumnCount('progress-header', data.progress.length);
        updateColumnCount('done-header', data.done.length);
    }
    
    function renderTasks(column, tasks) {
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            column.appendChild(taskElement);
        });
    }
    
    function createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'board__column__content__item';
        taskElement.setAttribute('draggable', 'true');
        taskElement.dataset.taskId = task.id;
        
        const formattedDate = formatDate(task.dueDate);
        
        taskElement.innerHTML = `
            <div class="task-actions">
                <button class="edit-task-btn">✏️</button>
                <button class="delete-task-btn">🗑️</button>
            </div>
            <h3 class="task-title">${task.title}</h3>
            <p class="task-desc">${task.description}</p>
            <div class="task-meta">
                <span class="task-due">Due: ${formattedDate}</span>
                <span class="task-priority priority-${task.priority}">${capitalizeFirstLetter(task.priority)}</span>
            </div>
        `;
        
        // Add event listeners for task actions
        const editBtn = taskElement.querySelector('.edit-task-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTask(task.id);
        });
        
        const deleteBtn = taskElement.querySelector('.delete-task-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        
        // Add drag and drop functionality
        setupTaskDragListeners(taskElement);
        
        return taskElement;
    }
    
    function editTask(taskId) {
        const boardData = getBoardData();
        let task = null;
        let taskStatus = '';
        
        // Find the task in any column
        ['todo', 'progress', 'done'].forEach(status => {
            const found = boardData[status].find(t => t.id === taskId);
            if (found) {
                task = found;
                taskStatus = status;
            }
        });
        
        if (task) {
            // Populate form
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('dueDate').value = task.dueDate;
            document.getElementById('priority').value = task.priority;
            document.getElementById('status').value = taskStatus;
            
            // Set editing task id
            editingTaskId = taskId;
            
            // Open form
            openTaskForm('Edit Task');
        }
    }
    
    function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            const boardData = getBoardData();
            
            // Remove task from any column
            ['todo', 'progress', 'done'].forEach(status => {
                boardData[status] = boardData[status].filter(task => task.id !== taskId);
            });
            
            // Save and reload
            saveBoardData(boardData);
            loadBoardData();
        }
    }
    
    function openTaskForm(title) {
        document.querySelector('.task-form__title').textContent = title;
        taskFormModal.classList.add('active');
    }
    
    function closeTaskForm() {
        taskFormModal.classList.remove('active');
        taskForm.reset();
        editingTaskId = null;
    }
    
    function setupDragAndDrop() {
        const columns = [todoColumn, progressColumn, doneColumn];
        
        columns.forEach(column => {
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('drop', handleDrop);
        });
    }
    
    function setupTaskDragListeners(taskElement) {
        taskElement.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', taskElement.dataset.taskId);
            setTimeout(() => {
                taskElement.classList.add('dragging');
            }, 0);
        });
        
        taskElement.addEventListener('dragend', function() {
            taskElement.classList.remove('dragging');
        });
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        
        // Add a visual cue for drop target
        this.classList.add('drag-over');
        
        // Find the task to insert before
        const afterElement = getDragAfterElement(this, e.clientY);
        const draggable = document.querySelector('.dragging');
        
        if (draggable) {
            if (afterElement) {
                this.insertBefore(draggable, afterElement);
            } else {
                this.appendChild(draggable);
            }
        }
    }
    
    function handleDrop(e) {
        e.preventDefault();
        
        // Remove visual cue
        document.querySelectorAll('.board__column__content').forEach(col => {
            col.classList.remove('drag-over');
        });
        
        const taskId = parseInt(e.dataTransfer.getData('text/plain'));
        if (!taskId) return;
        
        // Determine which column the task was dropped in
        let newStatus;
        if (this === todoColumn) {
            newStatus = 'todo';
        } else if (this === progressColumn) {
            newStatus = 'progress';
        } else if (this === doneColumn) {
            newStatus = 'done';
        }
        
        if (newStatus) {
            // Move task in the data model
            moveTask(taskId, newStatus);
        }
    }
    
    function moveTask(taskId, newStatus) {
        const boardData = getBoardData();
        let taskToMove = null;
        
        // Find and remove the task from its current column
        ['todo', 'progress', 'done'].forEach(status => {
            const taskIndex = boardData[status].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                taskToMove = boardData[status].splice(taskIndex, 1)[0];
            }
        });
        
        if (taskToMove) {
            // Add to new column
            boardData[newStatus].push(taskToMove);
            
            // Save changes
            saveBoardData(boardData);
            
            // Update column counts
            updateColumnCount('todo-header', boardData.todo.length);
            updateColumnCount('progress-header', boardData.progress.length);
            updateColumnCount('done-header', boardData.done.length);
        }
    }
    
    function getDragAfterElement(column, y) {
        const draggableElements = [...column.querySelectorAll('.board__column__content__item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Helper functions
    function formatDate(dateString) {
        if (!dateString) return 'Not set';
        
        const date = new Date(dateString);
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        
        return `${month} ${day}`;
    }
    
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function updateColumnCount(headerClass, count) {
        const header = document.querySelector(`.${headerClass}`);
        if (header) {
            const countElement = header.querySelector('.column-count');
            if (countElement) {
                countElement.textContent = count;
            }
        }
    }
});