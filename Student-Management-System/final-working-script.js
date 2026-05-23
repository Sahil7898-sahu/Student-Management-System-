// Complete Error-Free Student Management System
class FinalStudentSystem {
    constructor() {
        this.students = [];
        this.deskCharge = 500;
        this.currentStudentId = null;
        this.scriptUrl = '';
        this.currentPage = 'dashboard';
        this.isOnline = false;
        this.syncStatus = 'offline';
        this.init();
    }

    init() {
        this.loadScriptUrl();
        this.setupEventListeners();
        this.updateCurrentDate();
        this.loadLocalData();
    }

    loadScriptUrl() {
        try {
            this.scriptUrl = localStorage.getItem('googleScriptUrl') || '';
            if (this.scriptUrl) {
                this.testConnection();
            }
        } catch (error) {
            console.error('Error loading script URL:', error);
        }
    }

    async testConnection() {
        try {
            const response = await this.makeRequest('getDeskCharge');
            if (response && response.status === 'success') {
                this.isOnline = true;
                this.syncStatus = 'online';
                await this.syncFromGoogleSheets();
            }
        } catch (error) {
            this.isOnline = false;
            this.syncStatus = 'offline';
        }
        this.updateSyncStatus();
    }

    async syncFromGoogleSheets() {
        try {
            const response = await this.makeRequest('getStudents');
            if (response && response.status === 'success') {
                const googleStudents = response.data || [];
                this.students = googleStudents;
                this.saveLocalData();
                this.updateDashboard();
            }
        } catch (error) {
            console.log('Sync failed, using local data:', error);
        }
    }

    loadLocalData() {
        try {
            const localData = localStorage.getItem('students');
            const localCharge = localStorage.getItem('deskCharge');
            
            if (localData) {
                this.students = JSON.parse(localData);
            }
            if (localCharge) {
                this.deskCharge = parseInt(localCharge);
            }
            
            this.updateDashboard();
            this.setDeskChargeDisplay();
        } catch (error) {
            console.error('Error loading local data:', error);
            this.students = [];
            this.deskCharge = 500;
        }
    }

    saveLocalData() {
        try {
            localStorage.setItem('students', JSON.stringify(this.students));
            localStorage.setItem('deskCharge', this.deskCharge.toString());
        } catch (error) {
            console.error('Error saving local data:', error);
        }
    }

    async makeRequest(action, data = {}) {
        if (!this.scriptUrl) {
            throw new Error('Not connected to Google Sheets');
        }

        const formData = new FormData();
        formData.append('action', action);
        
        if (data.student) {
            formData.append('student', JSON.stringify(data.student));
        }
        if (data.studentId) {
            formData.append('studentId', data.studentId);
        }
        if (data.payment) {
            formData.append('payment', JSON.stringify(data.payment));
        }
        if (data.charge !== undefined) {
            formData.append('charge', data.charge);
        }

        const response = await fetch(this.scriptUrl, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.data);
        }
        
        return result;
    }

    registerStudent() {
        try {
            const student = {
                id: Date.now().toString(),
                name: document.getElementById('student-name').value.trim(),
                contact: document.getElementById('student-contact').value.trim(),
                email: document.getElementById('student-email').value.trim(),
                address: document.getElementById('student-address').value.trim(),
                fieldOfStudy: document.getElementById('field-study').value,
                deskNumber: document.getElementById('desk-number').value.trim(),
                registrationDate: new Date().toISOString(),
                payments: []
            };

            if (!this.validateStudentData(student)) {
                return;
            }

            if (this.isDeskTaken(student.deskNumber, student.id)) {
                this.showMessage('Desk number is already taken!', 'error');
                return;
            }

            this.saveToBoth(student);
            document.getElementById('student-form').reset();
            this.switchPage('students');
        } catch (error) {
            this.showMessage('Error registering student: ' + error.message, 'error');
        }
    }

    validateStudentData(data) {
        if (!data.name || !data.contact || !data.email || !data.address || !data.fieldOfStudy || !data.deskNumber) {
            this.showMessage('Please fill in all required fields!', 'error');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showMessage('Please enter a valid email address!', 'error');
            return false;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(data.contact)) {
            this.showMessage('Please enter a valid 10-digit phone number!', 'error');
            return false;
        }

        return true;
    }

    isDeskTaken(deskNumber, excludeId = null) {
        return this.students.some(student => 
            student.deskNumber.toLowerCase() === deskNumber.toLowerCase() && 
            student.id !== excludeId
        );
    }

    async saveToBoth(studentData) {
        try {
            // Save to local storage immediately
            this.students.push(studentData);
            this.saveLocalData();
            
            // Try to save to Google Sheets
            if (this.isOnline) {
                try {
                    const response = await this.makeRequest('addStudent', { student: studentData });
                    if (response.status === 'success') {
                        this.showMessage('✅ Saved to both local storage and Google Sheets!', 'success');
                    } else {
                        throw new Error(response.data);
                    }
                } catch (error) {
                    this.showMessage('⚠️ Saved locally, Google Sheets sync failed', 'warning');
                }
            } else {
                this.showMessage('✅ Saved to local storage only', 'success');
            }

            this.updateDashboard();
        } catch (error) {
            this.showMessage('Error saving student: ' + error.message, 'error');
        }
    }

    switchPage(pageId) {
        try {
            this.currentPage = pageId;
            
            // Update navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }

            // Update page visibility
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            const activePage = document.getElementById(pageId);
            if (activePage) {
                activePage.classList.add('active');
            }
            
            // Page-specific updates
            switch(pageId) {
                case 'dashboard':
                    this.updateDashboard();
                    break;
                case 'students':
                    this.displayStudentsTable();
                    break;
                case 'admin':
                    this.updateAdminStats();
                    break;
            }
        } catch (error) {
            console.error('Error switching page:', error);
        }
    }

    updateDashboard() {
        try {
            this.displayRecentStudents();
            this.updateStats();
            this.updateCurrentDate();
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    updateStats() {
        try {
            const totalStudents = this.students.length;
            const totalRevenue = this.students.reduce((sum, student) => {
                const studentPayments = student.payments || [];
                return sum + studentPayments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
            }, 0);
            
            const totalStudentsEl = document.getElementById('total-students');
            const totalRevenueEl = document.getElementById('total-revenue');
            const totalDesksEl = document.getElementById('total-desks');
            
            if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
            if (totalRevenueEl) totalRevenueEl.textContent = `₹${totalRevenue.toLocaleString()}`;
            if (totalDesksEl) totalDesksEl.textContent = totalStudents;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    displayRecentStudents() {
        try {
            const container = document.getElementById('recent-students');
            if (!container) return;
            
            const recent = this.students.slice(-6).reverse();
            
            if (recent.length === 0) {
                container.innerHTML = '<p>No students registered yet</p>';
                return;
            }

            container.innerHTML = recent.map(student => `
                <div class="recent-student" onclick="finalSystem.showStudentDetails('${student.id}')">
                    <div class="recent-student-avatar">
                        ${this.getInitials(student.name)}
                    </div>
                    <div class="recent-student-info">
                        <div class="recent-student-name">${this.escapeHtml(student.name)}</div>
                        <div class="recent-student-desk">Desk ${this.escapeHtml(student.deskNumber)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error displaying recent students:', error);
        }
    }

    getInitials(name) {
        try {
            return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        } catch (error) {
            return '??';
        }
    }

    displayStudentsTable() {
        try {
            const tableContainer = document.getElementById('students-table-container');
            const noStudents = document.getElementById('no-students');

            if (!tableContainer || !noStudents) return;

            if (this.students.length === 0) {
                tableContainer.style.display = 'none';
                noStudents.style.display = 'block';
                return;
            }

            tableContainer.style.display = 'block';
            noStudents.style.display = 'none';

            // Sort students by desk number
            const sortedStudents = [...this.students].sort((a, b) => {
                const aNum = parseInt(a.deskNumber.replace(/[^0-9]/g, '')) || 0;
                const bNum = parseInt(b.deskNumber.replace(/[^0-9]/g, '')) || 0;
                return aNum - bNum;
            });

            const tableHTML = `
                <div class="table-header">
                    <h3>Student Directory (Sorted by Desk Number)</h3>
                    <div class="table-actions">
                        <button class="btn-primary" onclick="finalSystem.displayStudentsTable()">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="students-table">
                        <thead>
                            <tr>
                                <th>Desk Number</th>
                                <th>Student Name</th>
                                <th>Contact</th>
                                <th>Email</th>
                                <th>Latest Payment</th>
                                <th>Registration Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedStudents.map(student => {
                                // Get latest payment for this student
                                let latestPaymentInfo = 'No payment';
                                let latestPaymentClass = 'no-payment';
                                
                                if (student.payments && student.payments.length > 0) {
                                    const sortedPayments = student.payments.sort((a, b) => 
                                        new Date(b.date) - new Date(a.date)
                                    );
                                    const latestPayment = sortedPayments[0];
                                    latestPaymentInfo = `₹${latestPayment.amount.toLocaleString()}`;
                                    latestPaymentClass = 'has-payment';
                                }
                                
                                return `
                                    <tr>
                                        <td>
                                            <span class="desk-badge">${this.escapeHtml(student.deskNumber)}</span>
                                        </td>
                                        <td>
                                            <button class="student-name-btn" onclick="finalSystem.showStudentDetails('${student.id}')">
                                                ${this.escapeHtml(student.name)}
                                            </button>
                                        </td>
                                        <td>${this.escapeHtml(student.contact)}</td>
                                        <td>${this.escapeHtml(student.email)}</td>
                                        <td>
                                            <span class="latest-payment ${latestPaymentClass}">
                                                ${latestPaymentInfo}
                                            </span>
                                        </td>
                                        <td>${new Date(student.registrationDate).toLocaleDateString()}</td>
                                        <td>
                                            <button class="btn-primary btn-sm" onclick="finalSystem.showStudentDetails('${student.id}')">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            tableContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error('Error displaying students table:', error);
        }
    }

    showStudentDetails(studentId) {
        try {
            const student = this.students.find(s => s.id === studentId);
            if (!student) return;

            // Calculate payment statistics
            const totalPayments = student.payments ? student.payments.reduce((sum, payment) => sum + payment.amount, 0) : 0;
            const paymentCount = student.payments ? student.payments.length : 0;
            
            // Get latest payment
            let latestPayment = null;
            if (student.payments && student.payments.length > 0) {
                const sortedPayments = student.payments.sort((a, b) => new Date(b.date) - new Date(a.date));
                latestPayment = sortedPayments[0];
            }

            // Create modal with complete student information
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.innerHTML = `
                <div class="modal-content student-detail-modal">
                    <div class="modal-header">
                        <h3>Complete Student Details - ${student.name}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="student-detail-grid">
                            <!-- Personal Information -->
                            <div class="detail-section">
                                <h4><i class="fas fa-user"></i> Personal Information</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Full Name:</span>
                                        <span class="detail-value">${this.escapeHtml(student.name)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Contact Number:</span>
                                        <span class="detail-value">${this.escapeHtml(student.contact)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Email Address:</span>
                                        <span class="detail-value">${this.escapeHtml(student.email)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Address:</span>
                                        <span class="detail-value">${this.escapeHtml(student.address)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Academic Information -->
                            <div class="detail-section">
                                <h4><i class="fas fa-graduation-cap"></i> Academic Information</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <span class="detail-label">Field of Study:</span>
                                        <span class="detail-value">${this.escapeHtml(student.fieldOfStudy)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Desk Number:</span>
                                        <span class="detail-value">${this.escapeHtml(student.deskNumber)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Registration Date:</span>
                                        <span class="detail-value">${new Date(student.registrationDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Payment Summary -->
                            <div class="detail-section">
                                <h4><i class="fas fa-rupee-sign"></i> Payment Summary</h4>
                                <div class="payment-summary-cards">
                                    <div class="payment-card total">
                                        <div class="payment-card-header">
                                            <i class="fas fa-coins"></i>
                                            <span>Total Paid</span>
                                        </div>
                                        <div class="payment-card-value">₹${totalPayments.toLocaleString()}</div>
                                    </div>
                                    <div class="payment-card count">
                                        <div class="payment-card-header">
                                            <i class="fas fa-receipt"></i>
                                            <span>Payments</span>
                                        </div>
                                        <div class="payment-card-value">${paymentCount}</div>
                                    </div>
                                    <div class="payment-card latest">
                                        <div class="payment-card-header">
                                            <i class="fas fa-clock"></i>
                                            <span>Latest Payment</span>
                                        </div>
                                        <div class="payment-card-value">
                                            ${latestPayment ? `₹${latestPayment.amount.toLocaleString()}` : 'No payment'}
                                        </div>
                                        ${latestPayment ? `<div class="payment-method-badge">${latestPayment.method}</div>` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Complete Payment History -->
                            <div class="detail-section">
                                <h4><i class="fas fa-history"></i> Complete Payment History</h4>
                                <div class="payment-history-list">
                                    ${student.payments && student.payments.length > 0 ? 
                                        student.payments.sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => `
                                            <div class="payment-record">
                                                <div class="payment-amount">₹${payment.amount.toLocaleString()}</div>
                                                <div class="payment-details">
                                                    <span class="payment-date">${new Date(payment.date).toLocaleDateString()}</span>
                                                    <span class="payment-method">${payment.method}</span>
                                                </div>
                                            </div>
                                        `).join('') : 
                                        '<div class="no-payments">No payments recorded yet</div>'
                                    }
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="detail-section">
                                <div class="action-buttons">
                                    <button class="btn-primary" onclick="finalSystem.showAdminPaymentModal('${student.id}')">
                                        <i class="fas fa-plus"></i> Add Payment
                                    </button>
                                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                                        <i class="fas fa-times"></i> Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error showing student details:', error);
            this.showMessage('Error showing student details', 'error');
        }
    }

    updateCurrentDate() {
        try {
            const dateElement = document.getElementById('current-date');
            if (dateElement) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                dateElement.textContent = new Date().toLocaleDateString('en-US', options);
            }
        } catch (error) {
            console.error('Error updating date:', error);
        }
    }

    setupEventListeners() {
        try {
            // Navigation
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = e.target.closest('.nav-btn').dataset.page;
                    this.switchPage(page);
                });
            });

            // Student Registration Form
            const studentForm = document.getElementById('student-form');
            if (studentForm) {
                studentForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.registerStudent();
                });
            }

            // Admin Panel
            const exportBtn = document.getElementById('export-data');
            const clearBtn = document.getElementById('clear-all-data');
            
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportData();
                });
            }
            
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                        this.clearAllData();
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    async addPayment(studentId, paymentData) {
        try {
            // Find student
            const student = this.students.find(s => s.id === studentId);
            if (!student) {
                this.showMessage('Student not found!', 'error');
                return;
            }

            // Add payment to local storage
            if (!student.payments) student.payments = [];
            student.payments.push(paymentData);
            this.saveLocalData();

            // Try to sync with Google Sheets
            if (this.isOnline) {
                try {
                    const response = await this.makeRequest('addPayment', { studentId, payment: paymentData });
                    if (response.status === 'success') {
                        this.showMessage('✅ Payment added to both storages!', 'success');
                    } else {
                        throw new Error(response.data);
                    }
                } catch (error) {
                    this.showMessage('⚠️ Payment saved locally, cloud sync failed', 'warning');
                }
            } else {
                this.showMessage('✅ Payment saved locally', 'success');
            }

            this.updateDashboard();
        } catch (error) {
            this.showMessage('Error adding payment: ' + error.message, 'error');
        }
    }

    showAdminPaymentModal(studentId) {
        try {
            const student = this.students.find(s => s.id === studentId);
            if (!student) return;

            const currentDate = new Date();
            const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Payment - ${student.name}</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="payment-month-indicator">
                            <i class="fas fa-calendar-check"></i>
                            <span>Adding payment for: <strong>${currentMonth}</strong></span>
                        </div>
                        <form id="admin-payment-form">
                            <div class="form-group">
                                <label>Student Name</label>
                                <input type="text" value="${student.name}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Desk Number</label>
                                <input type="text" value="${student.deskNumber}" readonly>
                            </div>
                            <div class="form-group">
                                <label for="admin-payment-amount">Amount (₹)</label>
                                <input type="number" id="admin-payment-amount" min="0" step="50" required>
                            </div>
                            <div class="form-group">
                                <label for="admin-payment-date">Date</label>
                                <input type="date" id="admin-payment-date" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label for="admin-payment-method">Payment Method</label>
                                <select id="admin-payment-method" required>
                                    <option value="">Select Method</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Online">Online Transfer</option>
                                    <option value="Check">Check</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-plus"></i> Add Payment
                                </button>
                                <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle form submission
            modal.querySelector('#admin-payment-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const paymentData = {
                    id: Date.now().toString(),
                    amount: parseInt(document.getElementById('admin-payment-amount').value),
                    date: document.getElementById('admin-payment-date').value,
                    method: document.getElementById('admin-payment-method').value,
                    timestamp: new Date().toISOString()
                };
                
                this.addPayment(studentId, paymentData);
                modal.remove();
            });
        } catch (error) {
            console.error('Error showing payment modal:', error);
            this.showMessage('Error showing payment modal', 'error');
        }
    }

    updateSyncStatus() {
        try {
            const statusEl = document.getElementById('sync-status');
            const cloudStatusEl = document.getElementById('cloud-status');
            
            if (statusEl) {
                let statusText = '';
                let statusClass = '';
                
                if (this.isOnline) {
                    statusText = '🟢 Online (Google Sheets + Local)';
                    statusClass = 'online';
                } else {
                    statusText = '🟡 Offline (Local Only)';
                    statusClass = 'offline';
                }
                
                statusEl.textContent = statusText;
                statusEl.className = `sync-status ${statusClass}`;
            }
            
            if (cloudStatusEl) {
                cloudStatusEl.textContent = this.isOnline ? '🟢 Connected' : '🟡 Not Connected';
            }
        } catch (error) {
            console.error('Error updating sync status:', error);
        }
    }

    setDeskChargeDisplay() {
        try {
            const deskChargeEl = document.getElementById('desk-charge');
            const currentChargeEl = document.getElementById('current-charge');
            
            if (deskChargeEl) deskChargeEl.textContent = `₹${this.deskCharge}`;
            if (currentChargeEl) currentChargeEl.value = this.deskCharge;
        } catch (error) {
            console.error('Error setting desk charge display:', error);
        }
    }

    updateAdminStats() {
        try {
            const adminStudents = document.getElementById('admin-total-students');
            const googleStatus = document.getElementById('google-sheets-status');
            
            if (adminStudents) adminStudents.textContent = this.students.length;
            if (googleStatus) {
                googleStatus.textContent = this.isOnline ? '🟢 Connected' : '🟡 Not Connected';
            }
        } catch (error) {
            console.error('Error updating admin stats:', error);
        }
    }

    async updateDeskCharge() {
        try {
            const newCharge = parseInt(document.getElementById('current-charge').value);
            
            if (newCharge < 0) {
                this.showMessage('Desk charge cannot be negative!', 'error');
                return;
            }

            this.showMessage('Updating desk charge...', 'info');

            if (this.isOnline) {
                const response = await this.makeRequest('updateDeskCharge', { charge: newCharge });
                if (response.status === 'success') {
                    this.deskCharge = newCharge;
                    this.setDeskChargeDisplay();
                    this.showMessage('✅ Desk charge updated successfully!', 'success');
                } else {
                    throw new Error(response.data);
                }
            } else {
                this.deskCharge = newCharge;
                localStorage.setItem('deskCharge', newCharge);
                this.setDeskChargeDisplay();
                this.showMessage('✅ Desk charge updated successfully!', 'success');
            }
        } catch (error) {
            this.showMessage('❌ Failed to update desk charge: ' + error.message, 'error');
        }
    }

    exportData() {
        try {
            const exportType = confirm('Export as PDF (table format)?\n\nOK = PDF\nCancel = JSON (original format)');
            
            if (exportType) {
                this.exportToPDF();
            } else {
                this.exportToJSON();
            }
        } catch (error) {
            this.showMessage('Error exporting data: ' + error.message, 'error');
        }
    }

    exportToPDF() {
        try {
            if (!window.jspdf) {
                this.showMessage('jsPDF library not loaded. Please refresh the page.', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.setTextColor(26, 54, 93);
            doc.text('Student Management System Report', 105, 20, { align: 'center' });
            
            // Add export date
            doc.setFontSize(12);
            doc.setTextColor(113, 128, 150);
            doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
            
            // Add summary section
            doc.setFontSize(14);
            doc.setTextColor(26, 54, 93);
            doc.text('Summary', 20, 55);
            
            doc.setFontSize(10);
            doc.setTextColor(45, 55, 72);
            doc.text(`Total Students: ${this.students.length}`, 20, 65);
            doc.text(`Desk Charge: ₹${this.deskCharge}`, 20, 72);
            
            const totalRevenue = this.students.reduce((sum, student) => {
                const studentPayments = student.payments || [];
                return sum + studentPayments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
            }, 0);
            doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString()}`, 20, 79);
            
            // Add student table
            doc.setFontSize(14);
            doc.setTextColor(26, 54, 93);
            doc.text('Student Details (Sorted by Desk Number)', 20, 95);
            
            // Sort students by desk number for PDF
            const sortedStudents = [...this.students].sort((a, b) => {
                const aNum = parseInt(a.deskNumber.replace(/[^0-9]/g, '')) || 0;
                const bNum = parseInt(b.deskNumber.replace(/[^0-9]/g, '')) || 0;
                return aNum - bNum;
            });
            
            // Table headers
            const headers = ['Desk', 'Name', 'Contact', 'Email', 'Latest Payment', 'Reg. Date'];
            const headerX = [20, 40, 90, 130, 170, 190];
            
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(26, 54, 93);
            
            headers.forEach((header, index) => {
                doc.rect(headerX[index], 105, headerX[index + 1] ? headerX[index + 1] - headerX[index] - 2 : 20, 8, 'F');
                doc.text(header, headerX[index] + 1, 110);
            });
            
            // Table data
            doc.setTextColor(45, 55, 72);
            doc.setFontSize(8);
            
            let yPosition = 118;
            sortedStudents.forEach((student, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                    
                    // Add headers on new page
                    doc.setFontSize(10);
                    doc.setTextColor(255, 255, 255);
                    doc.setFillColor(26, 54, 93);
                    headers.forEach((header, headerIndex) => {
                        doc.rect(headerX[headerIndex], yPosition, headerX[headerIndex + 1] ? headerX[headerIndex + 1] - headerX[headerIndex] - 2 : 20, 8, 'F');
                        doc.text(header, headerX[headerIndex] + 1, yPosition + 5);
                    });
                    yPosition += 10;
                    doc.setTextColor(45, 55, 72);
                    doc.setFontSize(8);
                }
                
                // Get latest payment for PDF
                let latestPaymentText = 'No payment';
                if (student.payments && student.payments.length > 0) {
                    const sortedPayments = student.payments.sort((a, b) => 
                        new Date(b.date) - new Date(a.date)
                    );
                    const latestPayment = sortedPayments[0];
                    latestPaymentText = `₹${latestPayment.amount.toLocaleString()}`;
                }
                
                // Student data
                doc.text(student.deskNumber, headerX[0] + 1, yPosition);
                doc.text(this.truncateText(student.name, 12), headerX[1] + 1, yPosition);
                doc.text(student.contact, headerX[2] + 1, yPosition);
                doc.text(this.truncateText(student.email, 15), headerX[3] + 1, yPosition);
                doc.text(this.truncateText(latestPaymentText, 8), headerX[4] + 1, yPosition);
                doc.text(new Date(student.registrationDate).toLocaleDateString(), headerX[5] + 1, yPosition);
                
                yPosition += 8;
            });
            
            // Save PDF
            doc.save(`student-management-report-${new Date().toISOString().split('T')[0]}.pdf`);
            this.showMessage('✅ PDF report exported successfully!', 'success');
        } catch (error) {
            this.showMessage('Error exporting PDF: ' + error.message, 'error');
        }
    }

    exportToJSON() {
        try {
            const exportData = {
                students: this.students,
                deskCharge: this.deskCharge,
                exportDate: new Date().toISOString(),
                syncStatus: this.syncStatus,
                localData: true,
                googleSheetsConnected: this.isOnline
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `final-student-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showMessage('✅ JSON data exported successfully!', 'success');
        } catch (error) {
            this.showMessage('Error exporting JSON: ' + error.message, 'error');
        }
    }

    truncateText(text, maxLength) {
        try {
            return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
        } catch (error) {
            return text || '';
        }
    }

    connectToGoogleSheets() {
        try {
            const url = prompt('Enter Google Sheets Web App URL:');
            if (!url) return;

            if (!url.includes('script.google.com') || !url.includes('/exec')) {
                this.showMessage('Invalid URL format!', 'error');
                return;
            }

            this.scriptUrl = url;
            localStorage.setItem('googleScriptUrl', url);
            this.testConnection();
        } catch (error) {
            this.showMessage('Error connecting to Google Sheets: ' + error.message, 'error');
        }
    }

    clearAllData() {
        try {
            if (this.isOnline) {
                this.showMessage('Clear all data not available in Google Sheets mode', 'error');
                return;
            }

            this.students = [];
            this.deskCharge = 500;
            this.saveLocalData();
            this.updateDashboard();
            this.setDeskChargeDisplay();
            
            this.showMessage('✅ All data cleared successfully!', 'success');
        } catch (error) {
            this.showMessage('Error clearing data: ' + error.message, 'error');
        }
    }

    showMessage(message, type) {
        try {
            const messageEl = document.getElementById('message');
            if (!messageEl) return;

            messageEl.textContent = message;
            messageEl.className = `message ${type} show`;

            setTimeout(() => {
                messageEl.classList.remove('show');
            }, 4000);
        } catch (error) {
            console.error('Error showing message:', error);
        }
    }

    escapeHtml(text) {
        try {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        } catch (error) {
            return text || '';
        }
    }
}

// Initialize system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.finalSystem = new FinalStudentSystem();
    } catch (error) {
        console.error('Error initializing system:', error);
    }
});
