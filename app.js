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

// 计算最佳活动时间
function calculateBestActivity() {
    const scheduleData = JSON.parse(localStorage.getItem('dailySchedule')) || [];
    if (scheduleData.length === 0) return;
    
    // 统计活动意向
    const activityCounts = {};
    scheduleData.forEach(person => {
        activityCounts[person.activity] = (activityCounts[person.activity] || 0) + 1;
    });
    
    // 找出最受欢迎的活动
    const mostPopularActivity = Object.keys(activityCounts).reduce((a, b) => 
        activityCounts[a] > activityCounts[b] ? a : b
    );
    
    // 分析共同空闲时间
    const timeSlots = {};
    scheduleData.forEach(person => {
        const [start, end] = person.time.split('-');
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
            const slot = `${hour}:00-${hour+1}:00`;
            timeSlots[slot] = (timeSlots[slot] || 0) + 1;
        }
    });
    
    // 找出最多人空闲的时间段
    let bestTime = '';
    let maxPeople = 0;
    for (const [slot, count] of Object.entries(timeSlots)) {
        if (count > maxPeople) {
            maxPeople = count;
            bestTime = slot;
        }
    }
    
    // 显示建议
    const suggestionElement = document.getElementById('suggestion');
    if (bestTime && mostPopularActivity) {
        const participants = scheduleData.filter(person => {
            const [start, end] = person.time.split('-');
            const [bestStart, bestEnd] = bestTime.split('-');
            return (start <= bestStart && end >= bestEnd);
        }).length;
        
        suggestionElement.innerHTML = `
            <p><strong>建议活动:</strong> ${mostPopularActivity}</p>
            <p><strong>最佳时间:</strong> ${bestTime}</p>
            <p><strong>可参与人数:</strong> ${participants}/${scheduleData.length}</p>
            <p class="mt-2 text-sm text-blue-600">* 基于多数人的空闲时间和活动意向计算得出</p>
        `;
    }
}

