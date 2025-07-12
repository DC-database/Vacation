const scriptURL = 'https://script.google.com/macros/s/AKfycbziJy7Izu8yyHp1OIy1fZUeNuaVWrDzgtIBoeVaVU3J_egDRiL7Ppskip2SjMz81t83/exec';
let currentEmployee = null;
let currentHr = null;

function formatDisplayDate(dateString) {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const months = [
      'January', 'February', 'March', 'April', 
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ];
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
}

function formatHrTableDate(dateString) {
  return formatDisplayDate(dateString);
}

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
    showError(msgElement, 'Please enter your employee ID');
    return;
  }

  showLoading(msgElement, 'Verifying...');

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
    showError(msgElement, error.message || 'Error verifying employee ID');
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
  const msgElement = document.getElementById('message');

  if (!startDate || !endDate) {
    showError(msgElement, 'Please select start date and enter total days');
    return;
  }

  showLoading(msgElement, 'Submitting request...');

  const params = new URLSearchParams();
  params.append('action', 'add');
  params.append('id', currentEmployee.id);
  params.append('name', currentEmployee.name);
  params.append('leaveType', leaveType);
  params.append('startDate', startDate);
  params.append('endDate', endDate);
  params.append('reason', reason);

  fetch(scriptURL, {
    method: 'POST',
    body: params
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      showSuccess(msgElement, data.message);
      document.getElementById('start-date').value = '';
      document.getElementById('end-date').value = '';
      document.getElementById('total-days').value = '1';
      document.getElementById('reason').value = '';
    } else {
      throw new Error(data.message || 'Error submitting request');
    }
  })
  .catch(error => {
    showError(msgElement, error.message || 'Error submitting request');
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
  requestsList.innerHTML = '<p class="loading">Loading your requests...</p>';

  fetch(`${scriptURL}?action=getEmployeeRequests&id=${encodeURIComponent(currentEmployee.id)}`, {
    method: 'POST',
  })
  .then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  })
  .then(data => {
    if (data.status === 'ok') {
      requestsList.innerHTML = '';
      
      if (data.requests && data.requests.length) {
        data.requests.forEach(request => {
          const requestItem = document.createElement('div');
          requestItem.className = 'request-item';
          const statusClass = request.status.toLowerCase();
          
          requestItem.innerHTML = `
            <h3>${request.leaveType} Leave</h3>
            <p><strong>Dates:</strong> ${request.startDate || 'N/A'} to ${request.endDate || 'N/A'}</p>
            <p><strong>Reason:</strong> ${request.reason || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="status ${statusClass}">${request.status || 'Pending'}</span></p>
            ${request.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${request.remarks}</div>` : ''}
            ${request.status === 'Rejected' ? 
              `<button onclick="resubmitRequest('${request.id}')">Resubmit</button>` : ''}
          `;
          requestsList.appendChild(requestItem);
        });
      } else {
        requestsList.innerHTML = '<p>No leave requests found.</p>';
      }
    } else {
      throw new Error(data.message || 'Error loading requests');
    }
  })
  .catch(error => {
    console.error('Error loading requests:', error);
    requestsList.innerHTML = `<p class="error">Error: ${error.message || 'Failed to load requests'}</p>`;
  });
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
      loadActiveStaff();
      loadOnLeaveStaff();
      loadPendingRequests();
    } else {
      throw new Error(data.message || 'Invalid HR credentials');
    }
  })
  .catch(error => {
    showError(msgElement, error.message || 'Login failed. Please try again.');
  });
}

function handleDashboardCardClick(section) {
  const targetSection = document.getElementById(`${section}-section`);
  const isHidden = targetSection.style.display === 'none';
  targetSection.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    targetSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function loadActiveStaff() {
  const activeBody = document.getElementById('active-staff-body');
  if (!activeBody) {
    console.error('Active staff body element not found');
    return;
  }
  
  activeBody.innerHTML = '<tr><td colspan="5" class="loading">Loading active staff...</td></tr>';

  fetch(`${scriptURL}?action=getActiveStaff`, {
    method: 'POST',
  })
  .then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  })
  .then(data => {
    if (data.status === 'ok') {
      document.getElementById('active-count').textContent = data.staff.length;
      document.getElementById('total-count').textContent = data.totalEmployees;
      document.getElementById('onleave-count').textContent = data.onLeaveCount;

      activeBody.innerHTML = '';
      
      if (data.staff?.length) {
        data.staff.forEach(employee => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${employee.id}</td>
            <td>${employee.name}</td>
            <td>${employee.hasPending || employee.hasApproved ? 'Yes' : 'No'}</td>
            <td>${employee.hasPending || employee.hasApproved ? employee.month : ''}</td>
            <td>${employee.hasPending ? 'Pending' : employee.hasApproved ? 'Approved' : ''}</td>
          `;
          activeBody.appendChild(row);
        });
      } else {
        activeBody.innerHTML = '<tr><td colspan="5">No active staff found</td></tr>';
      }
    } else {
      throw new Error(data.message || 'Error loading active staff');
    }
  })
  .catch(error => {
    console.error('Error loading active staff:', error);
    activeBody.innerHTML = `<tr><td colspan="5" class="error">Error: ${error.message || 'Failed to load active staff'}</td></tr>`;
  });
}

function loadOnLeaveStaff() {
  const onLeaveBody = document.getElementById('onleave-staff-body');
  onLeaveBody.innerHTML = '<tr><td colspan="4" class="loading">Loading staff on leave...</td></tr>';

  fetch(`${scriptURL}?action=getOnLeaveStaff`, {
    method: 'POST',
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      document.getElementById('onleave-count').textContent = data.staff?.length || 0;
      onLeaveBody.innerHTML = '';
      
      if (data.staff?.length) {
        data.staff.forEach(employee => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${employee.name}<br><small>ID: ${employee.id}</small></td>
            <td>${employee.leaveType}</td>
            <td class="date-display">${formatHrTableDate(employee.startDate)}</td>
            <td class="date-display">${formatHrTableDate(employee.endDate)}</td>
          `;
          onLeaveBody.appendChild(row);
        });
      } else {
        onLeaveBody.innerHTML = '<tr><td colspan="4">No staff currently on leave</td></tr>';
      }
    } else {
      throw new Error(data.message || 'Error loading staff on leave');
    }
  })
  .catch(error => {
    onLeaveBody.innerHTML = `<tr><td colspan="4" class="error">Error: ${error.message || 'Load failed'}</td></tr>`;
  });
}

function loadPendingRequests() {
  const pendingBody = document.getElementById('pending-requests-body');
  pendingBody.innerHTML = '<tr><td colspan="6" class="loading">Loading requests...</td></tr>';

  fetch(`${scriptURL}?action=getPendingRequests`, {
    method: 'POST',
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'ok') {
      document.getElementById('pending-count').textContent = data.requests?.length || 0;
      pendingBody.innerHTML = '';
      
      if (data.requests?.length) {
        data.requests.forEach(request => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${request.employeeName}<br><small>ID: ${request.employeeId}</small></td>
            <td>${request.leaveType}</td>
            <td class="date-display">${formatHrTableDate(request.startDate)}</td>
            <td class="date-display">${formatHrTableDate(request.endDate)}</td>
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
        pendingBody.innerHTML = '<tr><td colspan="6">No pending requests</td></tr>';
      }
    } else {
      throw new Error(data.message || 'Error loading pending requests');
    }
  })
  .catch(error => {
    pendingBody.innerHTML = `<tr><td colspan="6" class="error">Error: ${error.message || 'Load failed'}</td></tr>`;
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
      loadOnLeaveStaff();
    } else {
      throw new Error(data.message || 'Error updating request status');
    }
  })
  .catch(error => {
    alert(error.message || 'Error updating request status');
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

function showSuccess(element, message) {
  element.style.color = 'green';
  element.innerText = message;
}

function showLoading(element, message) {
  element.style.color = '#005b96';
  element.innerText = message;
}

function setupMobileMenu() {
  const menuBtn = document.createElement('div');
  menuBtn.id = 'mobile-menu-btn';
  menuBtn.innerHTML = '☰';
  document.body.prepend(menuBtn);
  
  menuBtn.addEventListener('click', () => {
    const nav = document.querySelector('.hr-tabs');
    if (nav) {
      nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth < 768) {
    setupMobileMenu();
  }
  
  document.querySelectorAll('.dashboard-card').forEach(card => {
    card.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      if (target) {
        handleDashboardCardClick(target);
      }
    });
  });
});