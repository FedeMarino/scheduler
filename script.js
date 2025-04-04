document.addEventListener('DOMContentLoaded', () => {
    // --- Selectors ---
    const taskNameInput = document.getElementById('task-name');
    const taskDurationSelect = document.getElementById('task-duration');
    const taskColorInput = document.getElementById('task-color');
    const taskForm = document.getElementById('task-form');
    const taskFormTitle = document.getElementById('task-form-title');
    const addTaskBtn = document.getElementById('add-task-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const unscheduledTasksContainer = document.getElementById('unscheduled-tasks');
    const scheduleTimeline = document.getElementById('schedule-timeline');
    const timelineWrapper = document.querySelector('.timeline-wrapper');
    const totalScheduledTimeEl = document.getElementById('total-scheduled-time');
    const totalFreeTimeEl = document.getElementById('total-free-time');
    const startHourSelect = document.getElementById('start-hour');
    const endHourSelect = document.getElementById('end-hour');
    const updateScheduleViewBtn = document.getElementById('update-schedule-view');
    const dropIndicator = document.getElementById('drop-indicator');
    const viewRangeToggle = document.getElementById('view-range-toggle');
    const viewRangeOptions = document.getElementById('view-range-options');
    const touchDragGhost = document.getElementById('touch-drag-ghost');
    // New Button Selectors
    const clearScheduleBtn = document.getElementById('clear-schedule-btn');
    const saveStateBtn = document.getElementById('save-state-btn');
    const loadStateBtn = document.getElementById('load-state-btn');
    const loadStateInput = document.getElementById('load-state-input');


    // --- Configuration ---
    const PIXELS_PER_MINUTE = 0.8;
    const DURATION_OPTIONS = [];
    const UNLIMITED_DURATION_VALUE = -1;
    for (let min = 15; min <= 180; min += 15) { DURATION_OPTIONS.push(min); }
    const PREDEFINED_COLORS = ['#fef4e5', '#dcedc8', '#e1f5fe', '#fce4ec', '#ede7f6', '#fff9c4', '#ffe0b2'];
    const TIMELINE_PADDING_TOP = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-padding-top')) || 15;
    const TASK_SHORT_THRESHOLD_MINUTES = 30;

    // --- State Variables ---
    let tasks = {};
    let nextTaskId = 1;
    let scheduleStartHour = 8;
    let scheduleEndHour = 18;
    let editingTaskId = null;
    let draggedTaskId = null;
    let draggedElement = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let isTouchDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let currentTouchX = 0;
    let currentTouchY = 0;

    // --- Robust Initialization ---
    function initialize() {
        const requiredElements = [taskNameInput, taskDurationSelect, taskColorInput, taskForm, taskFormTitle, addTaskBtn, cancelEditBtn, unscheduledTasksContainer, scheduleTimeline, timelineWrapper, totalScheduledTimeEl, totalFreeTimeEl, startHourSelect, endHourSelect, updateScheduleViewBtn, dropIndicator, viewRangeToggle, viewRangeOptions, touchDragGhost, clearScheduleBtn, saveStateBtn, loadStateBtn, loadStateInput];
        if (requiredElements.some(el => !el)) { console.error("Initialization failed: Missing elements.", requiredElements); alert("Error initializing."); return; }
        try {
            populateDurationSelect(); populateHourSelects(); setDefaultTimeRange(); loadTasks();
            setRandomDefaultColor(); addEventListeners();
            viewRangeOptions.classList.remove('visible'); viewRangeToggle.classList.remove('expanded');
            viewRangeToggle.querySelector('span').innerHTML = '&#9662;';
            console.log("Scheduler initialized successfully.");
        } catch (error) { console.error("Error during initialization:", error); alert("An error occurred initializing."); }
    }

    // --- Dropdown Population ---
    function populateDurationSelect() { /* ... (no change) ... */ taskDurationSelect.innerHTML = ''; DURATION_OPTIONS.forEach(minutes => { const option = document.createElement('option'); option.value = minutes; option.textContent = `${minutes} min` + (minutes >= 60 ? ` (${minutes / 60}h)` : ''); taskDurationSelect.appendChild(option); }); const unlimitedOption = document.createElement('option'); unlimitedOption.value = UNLIMITED_DURATION_VALUE; unlimitedOption.textContent = 'Unlimited'; taskDurationSelect.appendChild(unlimitedOption); }
    function populateHourSelects() { /* ... (no change) ... */ startHourSelect.innerHTML = ''; endHourSelect.innerHTML = ''; for (let i = 0; i < 24; i++) { const startOption = document.createElement('option'); startOption.value = i; startOption.textContent = `${String(i).padStart(2, '0')}:00`; startHourSelect.appendChild(startOption); const endOption = document.createElement('option'); endOption.value = i + 1; endOption.textContent = `${String(i + 1).padStart(2, '0')}:00`; endHourSelect.appendChild(endOption); } }
    function setDefaultTimeRange() { /* ... (no change) ... */ const now = new Date(); let defaultStart = now.getHours(); let defaultEnd = Math.min(24, defaultStart + 10); if (defaultEnd <= defaultStart + 1) { defaultEnd = Math.min(24, defaultStart + 2); if (defaultEnd <= defaultStart) { defaultStart = Math.max(0, 22); defaultEnd = 24; } } scheduleStartHour = defaultStart; scheduleEndHour = defaultEnd; startHourSelect.value = scheduleStartHour; endHourSelect.value = scheduleEndHour; }

    // --- Event Listeners ---
    function addEventListeners() {
        taskForm.addEventListener('submit', handleFormSubmit);
        updateScheduleViewBtn.addEventListener('click', handleUpdateScheduleView);
        viewRangeToggle.addEventListener('click', toggleViewRangeOptions);
        cancelEditBtn.addEventListener('click', cancelEditMode);
        // New Action Button Listeners
        clearScheduleBtn.addEventListener('click', handleClearSchedule);
        saveStateBtn.addEventListener('click', saveStateToFile);
        loadStateBtn.addEventListener('click', () => loadStateInput.click()); // Trigger hidden file input
        loadStateInput.addEventListener('change', handleFileLoad);
        // Drop Target Listeners
        unscheduledTasksContainer.addEventListener('dragover', handleDragOver);
        unscheduledTasksContainer.addEventListener('dragleave', handleDragLeave);
        unscheduledTasksContainer.addEventListener('drop', handleDrop);
        scheduleTimeline.addEventListener('dragover', handleDragOver);
        scheduleTimeline.addEventListener('dragleave', handleDragLeave);
        scheduleTimeline.addEventListener('drop', handleDrop);
        // Global Listeners
        document.addEventListener('dragend', handleDragEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);
    }

    // --- Expand/Collapse Function ---
    function toggleViewRangeOptions() { /* ... (no change - logic correct) ... */ const isVisible = viewRangeOptions.classList.toggle('visible'); viewRangeToggle.classList.toggle('expanded', isVisible); const arrow = viewRangeToggle.querySelector('span'); if (arrow) { arrow.innerHTML = isVisible ? '&#9652;' : '&#9662;'; } }

    // --- Task Management (Add/Edit/Delete) --- (No changes)
    function handleFormSubmit(event) { event.preventDefault(); if (editingTaskId) { updateTask(); } else { addNewTask(); } }
    function addNewTask() { /* ... */ const name = taskNameInput.value.trim(); const durationValue = taskDurationSelect.value; const duration = durationValue == UNLIMITED_DURATION_VALUE ? UNLIMITED_DURATION_VALUE : parseInt(durationValue, 10); const color = taskColorInput.value; if (name && (duration > 0 || duration === UNLIMITED_DURATION_VALUE)) { const taskId = `task-${nextTaskId++}`; tasks[taskId] = { id: taskId, name, duration, color, scheduled: false, startTimeMinutes: null }; renderTaskInPool(taskId); resetForm(); saveTasks(); } else { alert('Please enter a valid task name and duration.'); } }
    function enterEditMode(taskId) { /* ... */ const task = tasks[taskId]; if (!task) return; editingTaskId = taskId; taskNameInput.value = task.name; taskDurationSelect.value = task.duration; taskColorInput.value = task.color; taskFormTitle.textContent = "Edit Task"; addTaskBtn.textContent = "Update"; cancelEditBtn.style.display = 'inline'; taskNameInput.focus(); taskForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    function updateTask() { /* ... */ if (!editingTaskId || !tasks[editingTaskId]) return; const task = tasks[editingTaskId]; const name = taskNameInput.value.trim(); const durationValue = taskDurationSelect.value; const duration = durationValue == UNLIMITED_DURATION_VALUE ? UNLIMITED_DURATION_VALUE : parseInt(durationValue, 10); const color = taskColorInput.value; if (name && (duration > 0 || duration === UNLIMITED_DURATION_VALUE)) { task.name = name; task.duration = duration; task.color = color; resetForm(); saveTasks(); renderAll(); } else { alert('Please enter a valid task name and duration.'); } }
    function cancelEditMode() { resetForm(); }
    function resetForm() { /* ... */ editingTaskId = null; taskForm.reset(); taskDurationSelect.value = DURATION_OPTIONS[0]; setRandomDefaultColor(); taskFormTitle.textContent = "Add New Task"; addTaskBtn.textContent = "Add"; cancelEditBtn.style.display = 'none'; }
    function handleDeleteTask(taskId) { /* ... */ if (!tasks[taskId]) return; const taskName = tasks[taskId].name; if (confirm(`Delete task "${taskName}"?`)) { delete tasks[taskId]; saveTasks(); renderAll(); } }
    function setRandomDefaultColor() { /* ... */ if(editingTaskId) return; const randomIndex = Math.floor(Math.random() * PREDEFINED_COLORS.length); taskColorInput.value = PREDEFINED_COLORS[randomIndex]; }

    // --- Task Rendering --- (No changes)
    function createTaskElement(task, isScheduled) { /* ... */ const taskEl = document.createElement('div'); taskEl.className = isScheduled ? 'scheduled-task' : 'task-item'; taskEl.setAttribute('draggable', 'true'); taskEl.setAttribute('data-id', task.id); taskEl.style.backgroundColor = task.color; taskEl.style.color = getContrastColor(task.color); const contentEl = document.createElement(isScheduled ? 'div' : 'span'); contentEl.className = 'task-content'; const actionsEl = document.createElement('div'); actionsEl.className = 'task-actions'; const editBtn = document.createElement('button'); editBtn.className = 'edit-task'; editBtn.innerHTML = '<i class="fas fa-pencil-alt" title="Edit Task"></i>'; editBtn.onclick = (e) => { e.stopPropagation(); enterEditMode(task.id); }; const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-task'; deleteBtn.innerHTML = '<i class="fas fa-trash-alt" title="Delete Task"></i>'; deleteBtn.onclick = (e) => { e.stopPropagation(); handleDeleteTask(task.id); }; actionsEl.appendChild(editBtn); actionsEl.appendChild(deleteBtn); taskEl.appendChild(contentEl); taskEl.appendChild(actionsEl); taskEl.addEventListener('dragstart', handleDragStart); taskEl.addEventListener('touchstart', handleTouchStart, { passive: true }); return { taskEl, contentEl }; }
    function renderTaskInPool(taskId) { /* ... */ const task = tasks[taskId]; if (!task || task.scheduled) return; const { taskEl, contentEl } = createTaskElement(task, false); const durationText = task.duration === UNLIMITED_DURATION_VALUE ? 'Unlimited' : `${task.duration} min`; contentEl.textContent = `${task.name} (${durationText})`; taskEl.title = `${task.name} (${durationText})`; unscheduledTasksContainer.appendChild(taskEl); }
    function renderTaskOnSchedule(taskId) { /* ... */ const task = tasks[taskId]; if (!task || !task.scheduled || task.startTimeMinutes === null) return; const scheduleStartOffsetMinutes = scheduleStartHour * 60; const scheduleEndOffsetMinutes = scheduleEndHour * 60; let taskStartTimeForRender = task.startTimeMinutes; let taskEndTimeForRender; let effectiveDurationMinutes; let displayText; if (task.duration === UNLIMITED_DURATION_VALUE) { const { effectiveEndTimeMinutes, effectiveDurationMinutes: calculatedDuration } = getEffectiveEndTimeAndDuration(task.startTimeMinutes, task.id); taskEndTimeForRender = effectiveEndTimeMinutes; effectiveDurationMinutes = calculatedDuration; displayText = `${task.name} (${formatTime(taskStartTimeForRender)}-${formatTime(taskEndTimeForRender)}) <span class="effective-duration">[${effectiveDurationMinutes} min]</span>`; } else { taskEndTimeForRender = task.startTimeMinutes + task.duration; effectiveDurationMinutes = task.duration; displayText = `${task.name} (${formatTime(taskStartTimeForRender)}-${formatTime(taskEndTimeForRender)})`; } if (taskEndTimeForRender > scheduleStartOffsetMinutes && taskStartTimeForRender < scheduleEndOffsetMinutes) { const relativeStartTimeMinutes = taskStartTimeForRender - scheduleStartOffsetMinutes; const topPositionRaw = Math.max(0, relativeStartTimeMinutes * PIXELS_PER_MINUTE); const topPositionVisual = topPositionRaw + TIMELINE_PADDING_TOP; const visibleStartMinutes = Math.max(taskStartTimeForRender, scheduleStartOffsetMinutes); const visibleEndMinutes = Math.min(taskEndTimeForRender, scheduleEndOffsetMinutes); const height = Math.max(0, (visibleEndMinutes - visibleStartMinutes) * PIXELS_PER_MINUTE); if (height > 0) { const { taskEl, contentEl } = createTaskElement(task, true); contentEl.innerHTML = displayText; taskEl.style.top = `${topPositionVisual}px`; taskEl.style.height = `${Math.max(5, height)}px`; taskEl.title = `${task.name} (${formatTime(taskStartTimeForRender)} - ${formatTime(taskEndTimeForRender)}, ${effectiveDurationMinutes} min)`; if (effectiveDurationMinutes < TASK_SHORT_THRESHOLD_MINUTES) { taskEl.classList.add('task-short'); } scheduleTimeline.appendChild(taskEl); } } }

    // --- Utilities --- (No changes)
    function getEffectiveEndTimeAndDuration(taskStartTime, taskIdToExclude) { /* ... */ const scheduleViewEndMinutes = scheduleEndHour * 60; let nextTaskStartTime = scheduleViewEndMinutes; for (const id in tasks) { if (tasks.hasOwnProperty(id) && id !== taskIdToExclude && tasks[id].scheduled && tasks[id].startTimeMinutes > taskStartTime) { nextTaskStartTime = Math.min(nextTaskStartTime, tasks[id].startTimeMinutes); } } const effectiveEndTimeMinutes = nextTaskStartTime; const effectiveDurationMinutes = effectiveEndTimeMinutes - taskStartTime; return { effectiveEndTimeMinutes, effectiveDurationMinutes }; }
    function getContrastColor(hexcolor){ /* ... */ if (!hexcolor || hexcolor.length < 6) return '#000000'; hexcolor = hexcolor.replace("#", ""); if (hexcolor.length === 3) { hexcolor = hexcolor.split('').map(char => char + char).join('');} const r = parseInt(hexcolor.substr(0,2),16); const g = parseInt(hexcolor.substr(2,2),16); const b = parseInt(hexcolor.substr(4,2),16); if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000'; const yiq = ((r*299)+(g*587)+(b*114))/1000; return (yiq >= 135) ? '#000000' : '#ffffff'; }
    function formatTime(totalMinutes) { /* ... */ if (totalMinutes === null || isNaN(totalMinutes)) return ''; const hours = Math.floor(totalMinutes / 60) % 24; const minutes = totalMinutes % 60; return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`; }
    function formatDurationToHours(totalMinutes) { /* ... */ if (totalMinutes === null || isNaN(totalMinutes) || totalMinutes <= 0) { return "0.0 h"; } const hours = totalMinutes / 60; return `${hours.toFixed(1)} h`; }
    function clearRenderedTasks() { /* ... */ unscheduledTasksContainer.querySelectorAll('.task-item').forEach(el => el.remove()); scheduleTimeline.querySelectorAll('.scheduled-task').forEach(el => el.remove()); }
    // --- Rendering & Time Calculation ---
    function renderAll() { /* ... */ clearRenderedTasks(); const sortedScheduledTaskIds = Object.keys(tasks).filter(id => tasks[id] && tasks[id].scheduled && tasks[id].startTimeMinutes !== null).sort((a, b) => tasks[a].startTimeMinutes - tasks[b].startTimeMinutes); for (const taskId in tasks) { if (tasks.hasOwnProperty(taskId) && tasks[taskId] && !tasks[taskId].scheduled) { renderTaskInPool(taskId); } } sortedScheduledTaskIds.forEach(taskId => renderTaskOnSchedule(taskId)); updateScheduledAndFreeTime(); }
    function updateScheduledAndFreeTime() { /* ... */ let totalScheduledMinutesAll = 0; let visibleEffectiveMinutes = 0; const viewStartMinutes = scheduleStartHour * 60; const viewEndMinutes = scheduleEndHour * 60; const sortedScheduledTasks = Object.values(tasks).filter(task => task && task.scheduled && task.startTimeMinutes !== null).sort((a, b) => a.startTimeMinutes - b.startTimeMinutes); for (let i = 0; i < sortedScheduledTasks.length; i++) { const task = sortedScheduledTasks[i]; let effectiveDurationMinutes; let taskEndTimeMinutes; if (task.duration === UNLIMITED_DURATION_VALUE) { let nextTaskStart = viewEndMinutes; if (i + 1 < sortedScheduledTasks.length) { nextTaskStart = sortedScheduledTasks[i+1].startTimeMinutes; } taskEndTimeMinutes = nextTaskStart; effectiveDurationMinutes = taskEndTimeMinutes - task.startTimeMinutes; } else { effectiveDurationMinutes = task.duration; taskEndTimeMinutes = task.startTimeMinutes + effectiveDurationMinutes; totalScheduledMinutesAll += task.duration; } const overlapStart = Math.max(task.startTimeMinutes, viewStartMinutes); const overlapEnd = Math.min(taskEndTimeMinutes, viewEndMinutes); if (overlapEnd > overlapStart) { visibleEffectiveMinutes += (overlapEnd - overlapStart); } } const totalAvailableMinutesInView = (scheduleEndHour - scheduleStartHour) * 60; const freeMinutesInView = totalAvailableMinutesInView - visibleEffectiveMinutes; totalScheduledTimeEl.textContent = formatDurationToHours(totalScheduledMinutesAll); totalFreeTimeEl.textContent = formatDurationToHours(Math.max(0, freeMinutesInView)); }
    // --- Schedule View Update ---
    function handleUpdateScheduleView() { /* ... */ const newStart = parseInt(startHourSelect.value, 10); const newEnd = parseInt(endHourSelect.value, 10); if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) { alert("Invalid time range."); startHourSelect.value = scheduleStartHour; endHourSelect.value = scheduleEndHour; return; } scheduleStartHour = newStart; scheduleEndHour = newEnd; localStorage.setItem('scheduleViewStart', scheduleStartHour.toString()); localStorage.setItem('scheduleViewEnd', scheduleEndHour.toString()); generateTimelineMarkers(); renderAll(); }

    // --- Drag and Drop Logic (Mouse) --- (No changes)
    function handleDragStart(event) { /* ... */ const target = event.target.closest('.task-item, .scheduled-task'); if (!target || editingTaskId) { event.preventDefault(); return; } draggedTaskId = target.getAttribute('data-id'); draggedElement = target; event.dataTransfer.setData('text/plain', draggedTaskId); event.dataTransfer.effectAllowed = 'move'; const rect = target.getBoundingClientRect(); dragOffsetX = event.clientX - rect.left; dragOffsetY = event.clientY - rect.top; try { event.dataTransfer.setDragImage(target, dragOffsetX, dragOffsetY); } catch (e) { console.warn("setDragImage failed.", e); } setTimeout(() => { if (draggedElement) draggedElement.classList.add('dragging'); }, 0); }
    function handleDragEnd(event) { /* ... */ if (draggedElement) { draggedElement.classList.remove('dragging'); } hideDropIndicator(); unscheduledTasksContainer.classList.remove('drag-over'); draggedTaskId = null; draggedElement = null; dragOffsetX = 0; dragOffsetY = 0; }
    function handleDragOver(event) { /* ... */ event.preventDefault(); const dropzone = event.target.closest('.dropzone'); if (!dropzone || !draggedTaskId || !tasks[draggedTaskId]) { hideDropIndicator(); unscheduledTasksContainer.classList.remove('drag-over'); return; } event.dataTransfer.dropEffect = 'move'; if (dropzone.id === 'schedule-timeline') { const task = tasks[draggedTaskId]; if (!task) { hideDropIndicator(); return; } const timelineRect = scheduleTimeline.getBoundingClientRect(); const dropYRelativeToTimelineContent = event.clientY - timelineRect.top + scheduleTimeline.scrollTop - TIMELINE_PADDING_TOP; const dropYClamped = Math.max(0, dropYRelativeToTimelineContent); const minutesFromScheduleStart = dropYClamped / PIXELS_PER_MINUTE; const snapIncrement = 15; const snappedMinutes = Math.round(minutesFromScheduleStart / snapIncrement) * snapIncrement; const indicatorDuration = (task.duration === UNLIMITED_DURATION_VALUE) ? 60 : task.duration; const indicatorHeight = indicatorDuration * PIXELS_PER_MINUTE; const indicatorTopRaw = snappedMinutes * PIXELS_PER_MINUTE; const indicatorTopVisual = indicatorTopRaw + TIMELINE_PADDING_TOP; dropIndicator.style.top = `${indicatorTopVisual}px`; dropIndicator.style.height = `${indicatorHeight}px`; dropIndicator.style.display = 'block'; unscheduledTasksContainer.classList.remove('drag-over'); } else if (dropzone.id === 'unscheduled-tasks') { dropzone.classList.add('drag-over'); hideDropIndicator(); } else { hideDropIndicator(); unscheduledTasksContainer.classList.remove('drag-over'); } }
    function handleDragLeave(event) { /* ... */ const dropzone = event.target.closest('.dropzone'); if (dropzone && (!event.relatedTarget || !dropzone.contains(event.relatedTarget))) { if (dropzone.id === 'unscheduled-tasks') { dropzone.classList.remove('drag-over'); } hideDropIndicator(); } }
    function handleDrop(event) { /* ... */ event.preventDefault(); hideDropIndicator(); unscheduledTasksContainer.classList.remove('drag-over'); const dropzone = event.target.closest('.dropzone'); if (!dropzone || !draggedTaskId || !tasks[draggedTaskId]) { return; } const task = tasks[draggedTaskId]; let stateChanged = false; if (dropzone.id === 'schedule-timeline') { const timelineRect = scheduleTimeline.getBoundingClientRect(); const dropYRelativeToTimelineContent = event.clientY - timelineRect.top + scheduleTimeline.scrollTop - TIMELINE_PADDING_TOP; const dropYClamped = Math.max(0, dropYRelativeToTimelineContent); const minutesFromScheduleStart = dropYClamped / PIXELS_PER_MINUTE; const snapIncrement = 15; const snappedMinutes = Math.round(minutesFromScheduleStart / snapIncrement) * snapIncrement; const scheduleStartOffsetMinutes = scheduleStartHour * 60; const newStartTimeMinutes = snappedMinutes + scheduleStartOffsetMinutes; let overlaps = false; let newEndTimeMinutes; if (task.duration === UNLIMITED_DURATION_VALUE) { const { effectiveEndTimeMinutes } = getEffectiveEndTimeAndDuration(newStartTimeMinutes, draggedTaskId); newEndTimeMinutes = effectiveEndTimeMinutes; } else { newEndTimeMinutes = newStartTimeMinutes + task.duration; } for (const id in tasks) { if (tasks.hasOwnProperty(id) && tasks[id] && tasks[id].scheduled && tasks[id].id !== draggedTaskId && tasks[id].startTimeMinutes !== null) { const existingTask = tasks[id]; let existingStart = existingTask.startTimeMinutes; let existingEnd; if (existingTask.duration === UNLIMITED_DURATION_VALUE) { const { effectiveEndTimeMinutes } = getEffectiveEndTimeAndDuration(existingStart, id); existingEnd = effectiveEndTimeMinutes; } else { existingEnd = existingStart + existingTask.duration; } if (newStartTimeMinutes < existingEnd && newEndTimeMinutes > existingStart) { if (existingTask.duration === UNLIMITED_DURATION_VALUE) { continue; } overlaps = true; break; } } } if (overlaps) { alert("Time slot overlaps!"); return; } if (!task.scheduled || task.startTimeMinutes !== newStartTimeMinutes) { task.scheduled = true; task.startTimeMinutes = newStartTimeMinutes; stateChanged = true; } } else if (dropzone.id === 'unscheduled-tasks') { if (task.scheduled) { task.scheduled = false; task.startTimeMinutes = null; stateChanged = true; } } if (stateChanged) { renderAll(); saveTasks(); } }
    function hideDropIndicator() { /* ... */ if (dropIndicator) { dropIndicator.style.display = 'none'; } }

    // --- TOUCH Event Handlers --- (No changes)
    function handleTouchStart(event) { /* ... */ if (event.touches.length !== 1 || editingTaskId) { isTouchDragging = false; return; } const touch = event.touches[0]; const target = touch.target.closest('.task-item, .scheduled-task'); if (!target) return; isTouchDragging = true; draggedElement = target; draggedTaskId = target.getAttribute('data-id'); const rect = target.getBoundingClientRect(); dragOffsetX = touch.clientX - rect.left; dragOffsetY = touch.clientY - rect.top; touchStartX = touch.clientX; touchStartY = touch.clientY; currentTouchX = touch.clientX; currentTouchY = touch.clientY; touchDragGhost.innerHTML = draggedElement.innerHTML; touchDragGhost.style.width = `${rect.width}px`; touchDragGhost.style.height = `${rect.height}px`; touchDragGhost.style.backgroundColor = draggedElement.style.backgroundColor; touchDragGhost.style.color = draggedElement.style.color; touchDragGhost.style.border = '1px dashed #555'; touchDragGhost.style.borderRadius = getComputedStyle(draggedElement).borderRadius; touchDragGhost.style.fontSize = getComputedStyle(draggedElement).fontSize; touchDragGhost.style.padding = getComputedStyle(draggedElement).padding; touchDragGhost.style.left = `${touch.clientX - dragOffsetX}px`; touchDragGhost.style.top = `${touch.clientY - dragOffsetY}px`; touchDragGhost.style.display = 'block'; draggedElement.classList.add('dragging'); }
    function handleTouchMove(event) { /* ... */ if (!isTouchDragging || event.touches.length !== 1) return; event.preventDefault(); const touch = event.touches[0]; currentTouchX = touch.clientX; currentTouchY = touch.clientY; touchDragGhost.style.left = `${currentTouchX - dragOffsetX}px`; touchDragGhost.style.top = `${currentTouchY - dragOffsetY}px`; touchDragGhost.style.display = 'none'; const elementUnderTouch = document.elementFromPoint(currentTouchX, currentTouchY); touchDragGhost.style.display = 'block'; const dropzone = elementUnderTouch ? elementUnderTouch.closest('.dropzone') : null; unscheduledTasksContainer.classList.remove('drag-over'); hideDropIndicator(); if (dropzone) { if (dropzone.id === 'schedule-timeline') { const task = tasks[draggedTaskId]; if (!task) return; const timelineRect = scheduleTimeline.getBoundingClientRect(); const dropYRelativeToTimelineContent = currentTouchY - timelineRect.top + scheduleTimeline.scrollTop - TIMELINE_PADDING_TOP; const dropYClamped = Math.max(0, dropYRelativeToTimelineContent); const minutesFromScheduleStart = dropYClamped / PIXELS_PER_MINUTE; const snapIncrement = 15; const snappedMinutes = Math.round(minutesFromScheduleStart / snapIncrement) * snapIncrement; const indicatorDuration = (task.duration === UNLIMITED_DURATION_VALUE) ? 60 : task.duration; const indicatorHeight = indicatorDuration * PIXELS_PER_MINUTE; const indicatorTopRaw = snappedMinutes * PIXELS_PER_MINUTE; const indicatorTopVisual = indicatorTopRaw + TIMELINE_PADDING_TOP; dropIndicator.style.top = `${indicatorTopVisual}px`; dropIndicator.style.height = `${indicatorHeight}px`; dropIndicator.style.display = 'block'; } else if (dropzone.id === 'unscheduled-tasks') { dropzone.classList.add('drag-over'); } } }
    function handleTouchEnd(event) { /* ... */ if (!isTouchDragging) return; touchDragGhost.style.display = 'none'; const elementUnderTouch = document.elementFromPoint(currentTouchX, currentTouchY); const dropzone = elementUnderTouch ? elementUnderTouch.closest('.dropzone') : null; let stateChanged = false; if (dropzone && draggedTaskId && tasks[draggedTaskId]) { const task = tasks[draggedTaskId]; if (dropzone.id === 'schedule-timeline') { const timelineRect = scheduleTimeline.getBoundingClientRect(); const dropYRelativeToTimelineContent = currentTouchY - timelineRect.top + scheduleTimeline.scrollTop - TIMELINE_PADDING_TOP; const dropYClamped = Math.max(0, dropYRelativeToTimelineContent); const minutesFromScheduleStart = dropYClamped / PIXELS_PER_MINUTE; const snapIncrement = 15; const snappedMinutes = Math.round(minutesFromScheduleStart / snapIncrement) * snapIncrement; const scheduleStartOffsetMinutes = scheduleStartHour * 60; const newStartTimeMinutes = snappedMinutes + scheduleStartOffsetMinutes; let overlaps = false; let newEndTimeMinutes; if (task.duration === UNLIMITED_DURATION_VALUE) { const { effectiveEndTimeMinutes } = getEffectiveEndTimeAndDuration(newStartTimeMinutes, draggedTaskId); newEndTimeMinutes = effectiveEndTimeMinutes; } else { newEndTimeMinutes = newStartTimeMinutes + task.duration; } for (const id in tasks) { if (tasks.hasOwnProperty(id) && tasks[id] && tasks[id].scheduled && tasks[id].id !== draggedTaskId && tasks[id].startTimeMinutes !== null) { const existingTask = tasks[id]; let existingStart = existingTask.startTimeMinutes; let existingEnd; if (existingTask.duration === UNLIMITED_DURATION_VALUE) { const { effectiveEndTimeMinutes } = getEffectiveEndTimeAndDuration(existingStart, id); existingEnd = effectiveEndTimeMinutes; } else { existingEnd = existingStart + existingTask.duration; } if (newStartTimeMinutes < existingEnd && newEndTimeMinutes > existingStart) { if (existingTask.duration === UNLIMITED_DURATION_VALUE) { continue; } overlaps = true; break; } } } if (!overlaps) { if (!task.scheduled || task.startTimeMinutes !== newStartTimeMinutes) { task.scheduled = true; task.startTimeMinutes = newStartTimeMinutes; stateChanged = true; } } else { console.log("Overlap detected (touch)."); } } else if (dropzone.id === 'unscheduled-tasks') { if (task.scheduled) { task.scheduled = false; task.startTimeMinutes = null; stateChanged = true; } } } if (draggedElement) { draggedElement.classList.remove('dragging'); } hideDropIndicator(); unscheduledTasksContainer.classList.remove('drag-over'); touchDragGhost.style.display = 'none'; touchDragGhost.innerHTML = ''; isTouchDragging = false; draggedTaskId = null; draggedElement = null; dragOffsetX = 0; dragOffsetY = 0; touchStartX = 0; touchStartY = 0; currentTouchX = 0; currentTouchY = 0; if (stateChanged) { renderAll(); saveTasks(); } }

    // --- NEW: Clear Schedule Function ---
    function handleClearSchedule() {
        if (!confirm("Are you sure you want to clear the schedule?\n(All scheduled tasks will be moved back to the Unscheduled list)")) {
            return;
        }
        let needsUpdate = false;
        for (const taskId in tasks) {
            if (tasks.hasOwnProperty(taskId) && tasks[taskId].scheduled) {
                tasks[taskId].scheduled = false;
                tasks[taskId].startTimeMinutes = null;
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            saveTasks(); // Save changes to localStorage
            renderAll(); // Update UI
        }
    }

    // --- NEW: Save State to File Function ---
    function saveStateToFile() {
        try {
            const state = {
                tasks: tasks,
                nextTaskId: nextTaskId,
                scheduleViewStart: scheduleStartHour, // Also save view range
                scheduleViewEnd: scheduleEndHour
            };
            const jsonString = JSON.stringify(state, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            // Create filename with date/time
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            a.download = `scheduler_state_${timestamp}.json`;

            document.body.appendChild(a); // Required for Firefox
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up blob URL

        } catch (error) {
            console.error("Error saving state to file:", error);
            alert("Failed to save state. See console for details.");
        }
    }

    // --- NEW: Load State from File Function ---
    function handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) {
            return; // No file selected
        }

        if (file.type !== "application/json") {
             alert("Invalid file type. Please select a '.json' file.");
             loadStateInput.value = null; // Reset file input
             return;
         }

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const loadedState = JSON.parse(e.target.result);

                // Basic validation of loaded data
                if (typeof loadedState === 'object' && loadedState !== null &&
                    typeof loadedState.tasks === 'object' && loadedState.tasks !== null &&
                    typeof loadedState.nextTaskId === 'number')
                {
                    // Ask for confirmation before overwriting
                    if (!confirm("Loading this file will overwrite your current schedule. Are you sure?")) {
                         loadStateInput.value = null; // Reset file input
                         return;
                    }

                    // Restore state
                    tasks = loadedState.tasks;
                    nextTaskId = loadedState.nextTaskId;

                    // Restore view range if present in file
                    if (typeof loadedState.scheduleViewStart === 'number' && typeof loadedState.scheduleViewEnd === 'number' && loadedState.scheduleViewEnd > loadedState.scheduleViewStart) {
                         scheduleStartHour = loadedState.scheduleViewStart;
                         scheduleEndHour = loadedState.scheduleViewEnd;
                         startHourSelect.value = scheduleStartHour;
                         endHourSelect.value = scheduleEndHour;
                         // Also save loaded range preference
                         localStorage.setItem('scheduleViewStart', scheduleStartHour.toString());
                         localStorage.setItem('scheduleViewEnd', scheduleEndHour.toString());
                    }

                    // Save loaded state to localStorage
                    saveTasks();
                    // Re-render UI
                    generateTimelineMarkers(); // Regenerate based on loaded view range
                    renderAll();
                    resetForm(); // Ensure form is reset
                    alert("Schedule loaded successfully!");

                } else {
                    alert("Invalid file format. The JSON file does not contain the expected scheduler data structure.");
                }
            } catch (error) {
                console.error("Error parsing loaded file:", error);
                alert(`Failed to load state from file. Invalid JSON format or error during processing:\n${error.message}`);
            } finally {
                loadStateInput.value = null; // Reset file input regardless of success/failure
            }
        };

        reader.onerror = function() {
             console.error("Error reading file:", reader.error);
             alert("Error reading the selected file.");
             loadStateInput.value = null; // Reset file input
         };

        reader.readAsText(file);
    }


    // --- Persistence --- (Using v9 keys)
    function saveTasks() { try { localStorage.setItem('visualSchedulerTasks_v9', JSON.stringify(tasks)); localStorage.setItem('visualSchedulerNextId_v9', nextTaskId.toString()); } catch (error) { console.error("Error saving:", error); } }
    function loadTasks() {
        try { const savedStart = localStorage.getItem('scheduleViewStart'); const savedEnd = localStorage.getItem('scheduleViewEnd'); if (savedStart !== null && savedEnd !== null) { let start = parseInt(savedStart, 10); let end = parseInt(savedEnd, 10); if (!isNaN(start) && !isNaN(end) && end > start && start >= 0 && end <= 24) { scheduleStartHour = start; scheduleEndHour = end; } else { setDefaultTimeRange(); } } startHourSelect.value = scheduleStartHour; endHourSelect.value = scheduleEndHour; } catch (error) { console.error("Error loading view range:", error); setDefaultTimeRange(); startHourSelect.value = scheduleStartHour; endHourSelect.value = scheduleEndHour; }
        try { const savedTasks = localStorage.getItem('visualSchedulerTasks_v9'); const savedNextId = localStorage.getItem('visualSchedulerNextId_v9'); if (savedTasks) { tasks = JSON.parse(savedTasks); /* Basic Validation */ Object.keys(tasks).forEach(id => { if (!tasks[id].color) tasks[id].color = PREDEFINED_COLORS[0]; if (tasks[id].id === undefined) tasks[id].id = id; if (tasks[id].duration === undefined) tasks[id].duration = 60; }); } else { tasks = {}; } if (savedNextId) { nextTaskId = parseInt(savedNextId, 10); if (isNaN(nextTaskId)) nextTaskId = 1; } else { let maxId = 0; Object.keys(tasks).forEach(key => { if (key.startsWith('task-')) { const idNum = parseInt(key.split('-')[1], 10); if (!isNaN(idNum) && idNum > maxId) maxId = idNum; }}); nextTaskId = maxId + 1; } } catch (error) { console.error("Error loading tasks:", error); alert("Could not load saved tasks."); tasks = {}; nextTaskId = 1; localStorage.removeItem('visualSchedulerTasks_v9'); localStorage.removeItem('visualSchedulerNextId_v9'); }
        generateTimelineMarkers(); renderAll(); resetForm();
    }

    // --- Generate Timeline Markers --- (No changes)
    function generateTimelineMarkers() { /* ... */ if (!timelineWrapper || !scheduleTimeline) return; timelineWrapper.querySelectorAll('.time-marker').forEach(el => el.remove()); scheduleTimeline.querySelectorAll('.hour-line, .half-hour-line').forEach(el => el.remove()); const scheduleTotalMinutes = (scheduleEndHour - scheduleStartHour) * 60; if (scheduleTotalMinutes <= 0) { scheduleTimeline.style.height = `${TIMELINE_PADDING_TOP}px`; return; } scheduleTimeline.style.height = `${(scheduleTotalMinutes * PIXELS_PER_MINUTE) + TIMELINE_PADDING_TOP}px`; const scheduleStartOffsetMinutes = scheduleStartHour * 60; for (let hour = scheduleStartHour; hour <= scheduleEndHour; hour++) { const minutesFromViewStart = (hour * 60) - scheduleStartOffsetMinutes; const topPositionRaw = minutesFromViewStart * PIXELS_PER_MINUTE; const topPositionVisual = topPositionRaw + TIMELINE_PADDING_TOP; if(hour < scheduleEndHour) { const hourLine = document.createElement('div'); hourLine.className = 'hour-line'; hourLine.style.top = `${topPositionVisual}px`; scheduleTimeline.appendChild(hourLine); } const timeLabel = document.createElement('span'); timeLabel.className = 'time-marker'; timeLabel.textContent = `${String(hour).padStart(2, '0')}:00`; timeLabel.style.top = `${topPositionVisual}px`; timelineWrapper.appendChild(timeLabel); if (hour < scheduleEndHour && PIXELS_PER_MINUTE * 30 > 8) { const halfHourTopVisual = topPositionVisual + (30 * PIXELS_PER_MINUTE); const halfHourLine = document.createElement('div'); halfHourLine.className = 'half-hour-line'; halfHourLine.style.top = `${halfHourTopVisual}px`; scheduleTimeline.appendChild(halfHourLine); } } }

    // --- Start the App ---
    initialize();
});