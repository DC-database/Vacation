const scriptURL = 'https://script.google.com/macros/s/AKfycbwXZfUQV8bDNcLvatpeqmq9dINnKUWP7l-8DdBE4Yggyjmsr2g1_A2m3v1HwmI5-CI8/exec';
let currentEmployee = null;
let currentHr = null;

function calculateEndDate() {
  const startDate = document.getElementById('start-date').value;
  const totalDays = document.getElementById('total-days').value;
  
  if (startDate && totalDays) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(totalDays) - 1);
    document.getElementById('end-date').value = end.toISOString().split('T')[0];
  }
}

function verifyEmployee() {
  const employeeId = document.getElementById('employee-id').value.trim();
  const msgElement = document.getElementById('login-message');
  
  if (!employeeId) {
    msgElement.style.color = 'red';
    msgElement.innerText = 'Please enter your employee ID';
    return;
  }

  msgElement.style.color = '#005b96';
  msgElement.innerText = 'Verifying...';

  fetch(`${scriptURL}?action=verify&id=${encodeURIComponent(employeeId)}`, {
    method: 'POST',
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'verified') {
      currentEmployee = {
        id: employeeId,
        name: data.name
      };
      document.getElementById('display-name').textContent = data.name;
      document.getElementById('display-id').textContent = employeeId;
      document.getElementById('status-name').textContent = data.name;
      document.getElementById('status-id').textContent = employeeId;
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('request-container').style.display = 'block';
      document.getElementById('login-message').innerText = '';
    } else {
      throw new Error(data.message || 'Invalid employee ID');
    }
  })
  .catch(error => {
    msgElement.style.color = 'red';
    msgElement.innerText = error.message || 'Error verifying employee ID';
  });
}

function submitRequest() {
  if (!currentEmployee) {
    alert('Please login first');
    return;
  }

  const leaveType = document.getElementById('leave-type').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const reason = document.getElementById('reason').value;
  const email = document.getElementById('email').value;
  const msgElement = document.getElementById('message');

  if (!startDate || !endDate) {
    msgElement.style.color = 'red';
    msgElement.innerText = 'Please select start date and enter total days';
    return;
  }

  msgElement.style.color = '#005b96';
  msgElement.innerText = 'Submitting request...';

  const params = new URLSearchParams();
  params.append('action', 'add');
  params.append('id', currentEmployee.id);
  params.append('name', currentEmployee.name);
  params.append('leaveType', leaveType);
  params.append('startDate', startDate);
  params.append('endDate', endDate);
  params.append('reason', reason);
  params.append('email', email);

  fetch(scriptURL, {
    method: 'POST',
    body: params
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      msgElement.style.color = 'green';
      msgElement.innerText = data.message;
      document.getElementById('start-date').value = '';
      document.getElementById('end-date').value = '';
      document.getElementById('total-days').value = '1';
      document.getElementById('reason').value = '';
      document.getElementById('email').value = '';
    } else {
      throw new Error(data.message || 'Error submitting request');
    }
  })
  .catch(error => {
    msgElement.style.color = 'red';
    msgElement.innerText = error.message || 'Error submitting request';
  });
}

function showStatusPage() {
  if (!currentEmployee) {
    alert('Please login first');
    return;
  }

  document.getElementById('request-container').style.display = 'none';
  document.getElementById('status-container').style.display = 'block';
  loadEmployeeRequests();
}

function backToRequestForm() {
  document.getElementById('status-container').style.display = 'none';
  document.getElementById('request-container').style.display = 'block';
}

function loadEmployeeRequests() {
  const requestsList = document.getElementById('requests-list');
  requestsList.innerHTML = '<p>Loading your requests...</p>';

  fetch(`${scriptURL}?action=getEmployeeRequests&id=${encodeURIComponent(currentEmployee.id)}`, {
    method: 'POST',
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok' && data.requests?.length) {
      requestsList.innerHTML = '';
      data.requests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';
        const statusClass = request.status.toLowerCase();
        
        requestItem.innerHTML = `
          <h3>${request.leaveType} Leave</h3>
          <p><strong>Dates:</strong> ${formatDisplayDate(request.startDate)} to ${formatDisplayDate(request.endDate)}</p>
          <p><strong>Reason:</strong> ${request.reason}</p>
          <p><strong>Status:</strong> <span class="status ${statusClass}">${request.status}</span></p>
          ${request.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${request.remarks}</div>` : ''}
          ${request.status === 'Rejected' ? 
            `<button onclick="resubmitRequest('${request.id}')">Resubmit</button>` : ''}
        `;
        requestsList.appendChild(requestItem);
      });
    } else {
      requestsList.innerHTML = '<p>No leave requests found.</p>';
    }
  })
  .catch(error => {
    requestsList.innerHTML = `<p>Error: ${error.message || 'Failed to load requests'}</p>`;
  });
}

function formatDisplayDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    return `${year}-${day}-${month}`;
  } catch (e) {
    return dateString;
  }
}

function resubmitRequest(requestId) {
  if (!currentEmployee || !requestId) return;
  
  if (confirm('Are you sure you want to resubmit this request?')) {
    fetch(`${scriptURL}?action=resubmitRequest`, {
      method: 'POST',
      body: new URLSearchParams({
        id: requestId,
        employeeId: currentEmployee.id
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        alert('Request resubmitted successfully');
        loadEmployeeRequests();
      } else {
        throw new Error(data.message || 'Error resubmitting request');
      }
    })
    .catch(error => {
      alert(error.message || 'Error resubmitting request');
    });
  }
}

function showHrLogin() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('hr-login-container').style.display = 'block';
}

function backToEmployeeLogin() {
  document.getElementById('hr-login-container').style.display = 'none';
  document.getElementById('login-container').style.display = 'block';
}

function verifyHr() {
  const hrId = document.getElementById('hr-id').value.trim();
  const password = document.getElementById('hr-password').value.trim();
  const msgElement = document.getElementById('hr-login-message');
  
  if (!hrId || !password) {
    showError(msgElement, 'Please enter both HR ID and password');
    return;
  }

  showLoading(msgElement, 'Verifying HR credentials...');

  fetch(`${scriptURL}?action=verifyHr`, {
    method: 'POST',
    body: new URLSearchParams({
      id: hrId,
      password: password
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'verified') {
      currentHr = {
        id: hrId,
        name: data.name
      };
      document.getElementById('hr-name').textContent = data.name;
      document.getElementById('hr-login-container').style.display = 'none';
      document.getElementById('hr-approval-container').style.display = 'block';
      msgElement.innerText = '';
      loadPendingRequests();
    } else {
      throw new Error(data.message || 'Invalid HR credentials');
    }
  })
  .catch(error => {
    showError(msgElement, error.message || 'Login failed. Please try again.');
  });
}

function loadPendingRequests() {
  const pendingBody = document.getElementById('pending-requests-body');
  pendingBody.innerHTML = '<tr><td colspan="7" class="loading">Loading requests...</td></tr>';

  fetch(`${scriptURL}?action=getPendingRequests`, {
    method: 'POST',
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok' && data.requests?.length) {
      document.getElementById('pending-count').textContent = data.requests.length;
      pendingBody.innerHTML = '';
      
      data.requests.forEach(request => {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${request.employeeName}<br><small>ID: ${request.employeeId}</small></td>
          <td>${request.leaveType}</td>
          <td class="date-display">${formatDisplayDate(request.startDate)}</td>
          <td class="date-display">${formatDisplayDate(request.endDate)}</td>
          <td>${diffDays}</td>
          <td>${request.reason || '-'}</td>
          <td class="action-buttons">
            <textarea id="remarks-${request.id}" placeholder="HR remarks"></textarea>
            <button onclick="approveRequest('${request.id}')" class="approve-btn">Approve</button>
            <button onclick="rejectRequest('${request.id}')" class="reject-btn">Reject</button>
          </td>
        `;
        pendingBody.appendChild(row);
      });
    } else {
      pendingBody.innerHTML = '<tr><td colspan="7">No pending requests</td></tr>';
      document.getElementById('pending-count').textContent = '0';
    }
  })
  .catch(error => {
    pendingBody.innerHTML = `<tr><td colspan="7">Error: ${error.message || 'Load failed'}</td></tr>`;
  });
}

function approveRequest(requestId) {
  const remarks = document.getElementById(`remarks-${requestId}`).value;
  updateRequestStatus(requestId, 'Approved', remarks);
}

function rejectRequest(requestId) {
  const remarks = document.getElementById(`remarks-${requestId}`).value;
  updateRequestStatus(requestId, 'Rejected', remarks);
}

function updateRequestStatus(requestId, status, remarks) {
  fetch(`${scriptURL}?action=updateRequestStatus`, {
    method: 'POST',
    body: new URLSearchParams({
      id: requestId,
      status: status,
      remarks: remarks || '',
      hrId: currentHr?.id || ''
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      loadPendingRequests();
    } else {
      throw new Error(data.message || 'Error updating request status');
    }
  })
  .catch(error => {
    alert(error.message || 'Error updating request status');
  });
}

function switchHrTab(tabName) {
  document.getElementById('tab-pending').classList.remove('active');
  document.getElementById('tab-history').classList.remove('active');
  document.getElementById('pending-section').style.display = 'none';
  document.getElementById('history-section').style.display = 'none';
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`${tabName}-section`).style.display = 'block';
  
  if (tabName === 'pending') {
    loadPendingRequests();
  }
}

function loadEmployeeHistory() {
  const employeeId = document.getElementById('history-employee-id').value.trim();
  const historyList = document.getElementById('employee-history-list');
  
  if (!employeeId) {
    alert('Please enter an employee ID');
    return;
  }
  
  historyList.innerHTML = '<p>Loading employee history...</p>';
  
  fetch(`${scriptURL}?action=getEmployeeHistory&id=${encodeURIComponent(employeeId)}`, {
    method: 'POST',
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok' && data.history?.length) {
      historyList.innerHTML = '';
      
      const groupedByYear = {};
      data.history.forEach(request => {
        const year = new Date(request.timestamp).getFullYear();
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push(request);
      });
      
      for (const year in groupedByYear) {
        const yearHeader = document.createElement('h3');
        yearHeader.textContent = year;
        historyList.appendChild(yearHeader);
        
        groupedByYear[year].forEach(request => {
          const historyItem = document.createElement('div');
          historyItem.className = 'history-item';
          const statusClass = request.status.toLowerCase();
          
          historyItem.innerHTML = `
            <p><strong>Type:</strong> ${request.leaveType}</p>
            <p><strong>Dates:</strong> ${formatDisplayDate(request.startDate)} to ${formatDisplayDate(request.endDate)}</p>
            <p><strong>Status:</strong> <span class="status ${statusClass}">${request.status}</span></p>
            <p><strong>Requested:</strong> ${formatDisplayDate(request.timestamp)}</p>
            ${request.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${request.remarks}</div>` : ''}
          `;
          historyList.appendChild(historyItem);
        });
      }
    } else {
      historyList.innerHTML = '<p>No history found for this employee.</p>';
    }
  })
  .catch(error => {
    historyList.innerHTML = `<p>Error: ${error.message || 'Failed to load history'}</p>`;
  });
}

function hrLogout() {
  currentHr = null;
  document.getElementById('hr-id').value = '';
  document.getElementById('hr-password').value = '';
  document.getElementById('hr-approval-container').style.display = 'none';
  document.getElementById('login-container').style.display = 'block';
  document.getElementById('hr-login-message').innerText = '';
}

function logout() {
  currentEmployee = null;
  document.getElementById('employee-id').value = '';
  document.getElementById('request-container').style.display = 'none';
  document.getElementById('status-container').style.display = 'none';
  document.getElementById('login-container').style.display = 'block';
  document.getElementById('login-message').innerText = '';
}

function showError(element, message) {
  element.style.color = 'red';
  element.innerText = message;
}

function showLoading(element, message) {
  element.style.color = '#005b96';
  element.innerText = message;
}