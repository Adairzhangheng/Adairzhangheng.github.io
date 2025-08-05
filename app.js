// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 显示当前日期
    const today = new Date();
    document.getElementById('currentDate').textContent = today.toLocaleDateString('zh-CN');
    
    // 加载存储的数据
    loadScheduleData();
    
    // 表单提交事件
    document.getElementById('personForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addPerson();
    });
    
    // 清空所有数据
    document.getElementById('clearAll').addEventListener('click', clearAllData);
});

// 添加人员信息
function addPerson() {
    const name = document.getElementById('personName').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const activity = document.getElementById('activityPreference').value;
    
    if (!name) {
        alert('请输入姓名');
        return;
    }
    
    const personData = {
        id: Date.now(),
        name,
        time: `${startTime}-${endTime}`,
        activity
    };
    
    // 获取现有数据
    let scheduleData = JSON.parse(localStorage.getItem('dailySchedule')) || [];
    scheduleData.push(personData);
    
    // 保存到本地存储
    localStorage.setItem('dailySchedule', JSON.stringify(scheduleData));
    
    // 刷新显示
    loadScheduleData();
    
    // 重置表单
    document.getElementById('personForm').reset();
    document.getElementById('personName').focus();
    
    // 计算建议活动
    calculateBestActivity();
}

// 加载数据到表格
function loadScheduleData() {
    const scheduleData = JSON.parse(localStorage.getItem('dailySchedule')) || [];
    const tableBody = document.getElementById('scheduleTable');
    
    tableBody.innerHTML = '';
    
    if (scheduleData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-gray-500">暂无数据</td></tr>';
        return;
    }
    
    scheduleData.forEach(person => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-2 px-4 border">${person.name}</td>
            <td class="py-2 px-4 border">${person.time}</td>
            <td class="py-2 px-4 border">${person.activity}</td>
            <td class="py-2 px-4 border text-center">
                <button onclick="deletePerson(${person.id})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 删除人员
function deletePerson(id) {
    let scheduleData = JSON.parse(localStorage.getItem('dailySchedule')) || [];
    scheduleData = scheduleData.filter(person => person.id !== id);
    localStorage.setItem('dailySchedule', JSON.stringify(scheduleData));
    loadScheduleData();
    calculateBestActivity();
}

// 清空所有数据
function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        localStorage.removeItem('dailySchedule');
        loadScheduleData();
        document.getElementById('suggestion').textContent = '添加人员信息后，系统将自动计算最佳活动时间';
    }
}

// 将时间字符串转换为分钟数
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 计算最佳活动时间（修复版）
function calculateBestActivity() {
    const scheduleData = JSON.parse(localStorage.getItem('dailySchedule')) || [];
    if (scheduleData.length === 0) {
        document.getElementById('suggestion').innerHTML = '添加人员信息后，系统将自动计算最佳活动时间';
        return;
    }
    
    // 统计活动意向
    const activityCounts = {};
    scheduleData.forEach(person => {
        activityCounts[person.activity] = (activityCounts[person.activity] || 0) + 1;
    });
    
    // 找出最受欢迎的活动
    const mostPopularActivity = Object.keys(activityCounts).reduce((a, b) => 
        activityCounts[a] > activityCounts[b] ? a : b
    );
    
    // 创建时间段数组（半小时间隔）
    const timeSlots = [];
    const startHour = 19 * 60; // 19:00
    const endHour = 25.5 * 60; // 01:30 (第二天) = 24 + 1.5 = 25.5小时
    
    for (let time = startHour; time <= endHour; time += 30) {
        const slotStart = time % (24 * 60);
        const slotEnd = (time + 30) % (24 * 60);
        
        // 格式化时间为HH:mm
        const formatTime = minutes => {
            const h = Math.floor(minutes / 60) % 24;
            const m = minutes % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        
        timeSlots.push({
            start: slotStart,
            end: slotEnd,
            label: `${formatTime(slotStart)}-${formatTime(slotEnd)}`,
            count: 0
        });
    }
    
    // 计算每个时间段的人数
    timeSlots.forEach(slot => {
        scheduleData.forEach(person => {
            const [startStr, endStr] = person.time.split('-');
            const personStart = timeToMinutes(startStr);
            let personEnd = timeToMinutes(endStr);
            
            // 处理跨天情况（结束时间小于开始时间）
            if (personEnd < personStart) {
                personEnd += 24 * 60;
            }
            
            // 检查该时间段是否在人员空闲时间内
            let slotStart = slot.start;
            let slotEnd = slot.end;
            
            // 处理跨天时间段
            if (slotEnd < slotStart) {
                slotEnd += 24 * 60;
            }
            
            if (personStart <= slotStart && personEnd >= slotEnd) {
                slot.count++;
            }
        });
    });
    
    // 找出最多人空闲的时间段
    let bestSlot = timeSlots[0];
    timeSlots.forEach(slot => {
        if (slot.count > bestSlot.count) {
            bestSlot = slot;
        }
    });
    
    // 显示建议
    const suggestionElement = document.getElementById('suggestion');
    if (bestSlot.count > 0) {
        suggestionElement.innerHTML = `
            <p><strong>建议活动:</strong> ${mostPopularActivity}</p>
            <p><strong>最佳时间:</strong> ${bestSlot.label}</p>
            <p><strong>可参与人数:</strong> ${bestSlot.count}/${scheduleData.length}</p>
            <p class="mt-2 text-sm text-blue-600">* 基于多数人的空闲时间和活动意向计算得出</p>
        `;
    } else {
        suggestionElement.textContent = '没有找到合适的共同空闲时间';
    }
}
