// Professional Student Management System JavaScript with Google Sheets Integration

class StudentManagementSystem {
    constructor() {
        this.students = [];
        this.deskCharge = 500;
        this.currentStudentId = null;
        this.scriptUrl = '';
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadScriptUrl();
        this.updateCurrentDate();
        this.initializeMonthYearSelectors();
    }

    loadScriptUrl() {
        this.scriptUrl = localStorage.getItem('googleScriptUrl') || '';
        
        if (!this.scriptUrl) {
            this.showSetupModal();
        } else {
            this.loadData();
        }
    }

    showSetupModal() {
        const modalHtml = `
            <div id="setup-modal" class="modal show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Google Sheets Setup</h3>
                        <button class="modal-close" onclick="sms.closeSetupModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="setup-instructions">
                            <h4>Setup Instructions:</h4>
                            <ol>
                                <li>Go to <a href="https://script.google.com" target="_blank">Google Apps Script</a></li>
                                <li>Create a new project</li>
                                <li>Copy the code from <code>google-script.js</code></li>
                                <li>Paste it into the script editor</li>
                                <li>Save the project</li>
                                <li>Deploy as Web App:</li>
                                <ul>
                                    <li>Click "Deploy" → "New deployment"</li>
                                    <li>Select "Web app"</li>
                                    <li>Execute as: "Me"</li>
                                    <li>Who has access: "Anyone"</li>
                                    <li>Click "Deploy"</li>
                                    <li>Copy the Web app URL</li>
                                </ul>
                                <li>Paste the URL below and click "Connect"</li>
                            </ol>
                        </div>
                        <div class="form-group">
                            <label for="script-url-input">Google Apps Script Web App URL:</label>
                            <input type="url" id="script-url-input" placeholder="https://script.google.com/macros/s/..." required>
                        </div>
                        <div class="form-actions">
                            <button onclick="sms.connectToGoogleSheets()" class="btn-primary">Connect to Google Sheets</button>
                            <button onclick="sms.useLocalStorage()" class="btn-secondary">Use Local Storage (Offline)</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.addModalStyles();
    }

    addModalStyles() {
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 10000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                }
                .modal.show {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-content {
                    background: var(--card-bg);
                    border-radius: 16px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: slideUp 0.3s ease;
                    box-shadow: var(--shadow-xl);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem;
                    border-bottom: 1px solid var(--border-color);
                }
                .modal-header h3 {
                    margin: 0;
                    color: var(--primary-color);
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s ease;
                }
                .modal-close:hover {
                    background: var(--light-bg);
                }
                .modal-body {
                    padding: 2rem;
                }
                .setup-instructions {
                    margin-bottom: 2rem;
                }
                .setup-instructions h4 {
                    margin-bottom: 1rem;
                    color: var(--primary-color);
                }
                .setup-instructions ol, .setup-instructions ul {
                    margin-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .setup-instructions li {
                    margin-bottom: 0.5rem;
                    color: var(--text-secondary);
                }
                .setup-instructions a {
                    color: var(--accent-color);
                    text-decoration: none;
                    font-weight: 500;
                }
                .setup-instructions a:hover {
                    text-decoration: underline;
                }
                .setup-instructions code {
                    background: var(--light-bg);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                }
            `;
            document.head.appendChild(style);
        }
    }

    connectToGoogleSheets() {
        const urlInput = document.getElementById('script-url-input');
        if (!urlInput.value.trim()) {
            this.showMessage('Please enter the Google Apps Script URL', 'error');
            return;
        }

        this.scriptUrl = urlInput.value.trim();
        localStorage.setItem('googleScriptUrl', this.scriptUrl);
        
        this.makeRequest('getDeskCharge')
            .then(response => {
                if (response.status === 'success') {
                    this.deskCharge = response.data;
                    this.setDeskChargeDisplay();
                    this.loadData();
                    this.closeSetupModal();
                    this.showMessage('Connected to Google Sheets successfully!', 'success');
                }
            })
            .catch(error => {
                this.showMessage('Failed to connect to Google Sheets: ' + error.message, 'error');
            });
    }

    useLocalStorage() {
        this.scriptUrl = '';
        localStorage.removeItem('googleScriptUrl');
        this.closeSetupModal();
        
        this.students = JSON.parse(localStorage.getItem('students')) || [];
        this.deskCharge = parseInt(localStorage.getItem('deskCharge')) || 500;
        
        this.updateDashboard();
        this.setDeskChargeDisplay();
        this.showMessage('Using local storage mode', 'success');
    }

    closeSetupModal() {
        const modal = document.getElementById('setup-modal');
        if (modal) {
            modal.remove();
        }
    }

    makeRequest(action, data = {}) {
        if (!this.scriptUrl) {
            return Promise.reject(new Error('Not connected to Google Sheets'));
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

        return fetch(this.scriptUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'error') {
                throw new Error(result.data);
            }
            return result;
        });
    }

    loadData() {
        if (!this.scriptUrl) {
            this.students = JSON.parse(localStorage.getItem('students')) || [];
            this.deskCharge = parseInt(localStorage.getItem('deskCharge')) || 500;
            this.updateDashboard();
            this.setDeskChargeDisplay();
            return;
        }

        Promise.all([
            this.makeRequest('getStudents'),
            this.makeRequest('getDeskCharge')
        ])
        .then(([studentsResponse, chargeResponse]) => {
            this.students = studentsResponse.data || [];
            this.deskCharge = chargeResponse.data || 500;
            this.updateDashboard();
            this.setDeskChargeDisplay();
        })
        .catch(error => {
            console.error('Failed to load data:', error);
            this.showMessage('Failed to load data from Google Sheets', 'error');
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.closest('.nav-btn').dataset.page;
                this.switchPage(page);
            });
        });

        // Student Registration Form
        document.getElementById('student-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerStudent();
        });

        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchStudents(e.target.value);
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.displayStudents(this.students);
        });

        // Admin Panel
        document.getElementById('desk-charge-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateDeskCharge();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('clear-all-data').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                this.clearAllData();
            }
        });

        // Payment Form
        document.getElementById('payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPayment();
        });

        // Month/Year selectors
        document.getElementById('payment-month').addEventListener('change', () => {
            this.updateMonthlyPayments();
        });

        document.getElementById('payment-year').addEventListener('change', () => {
            this.updateMonthlyPayments();
        });
    }

    switchPage(pageId) {
        this.currentPage = pageId;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        // Update page visibility
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        // Page-specific updates
        switch(pageId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'students':
                this.displayStudents(this.students);
                break;
            case 'monthly-payments':
                this.updateMonthlyPayments();
                break;
            case 'admin':
                this.updateAdminStats();
                break;
        }
    }

    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = new Date().toLocaleDateString('en-US', options);
        }
    }

    initializeMonthYearSelectors() {
        const monthSelect = document.getElementById('payment-month');
        const yearSelect = document.getElementById('payment-year');
        
        if (monthSelect && yearSelect) {
            // Populate months
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
            const currentMonth = new Date().getMonth();
            
            months.forEach((month, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = month;
                if (index === currentMonth) option.selected = true;
                monthSelect.appendChild(option);
            });
            
            // Populate years
            const currentYear = new Date().getFullYear();
            for (let year = currentYear - 5; year <= currentYear + 5; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) option.selected = true;
                yearSelect.appendChild(option);
            }
        }
    }

    registerStudent() {
        const formData = {
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

        if (!this.validateStudentData(formData)) {
            return;
        }

        if (this.isDeskTaken(formData.deskNumber, formData.id)) {
            this.showMessage('Desk number is already taken!', 'error');
            return;
        }

        if (this.scriptUrl) {
            this.makeRequest('addStudent', { student: formData })
                .then(response => {
                    this.students.push(formData);
                    this.updateDashboard();
                    this.showMessage('Student registered successfully!', 'success');
                    document.getElementById('student-form').reset();
                    this.switchPage('students');
                })
                .catch(error => {
                    this.showMessage('Failed to register student: ' + error.message, 'error');
                });
        } else {
            this.students.push(formData);
            this.saveLocalData();
            this.updateDashboard();
            this.showMessage('Student registered successfully!', 'success');
            document.getElementById('student-form').reset();
            this.switchPage('students');
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

    updateDashboard() {
        this.displayRecentStudents();
        this.updateStats();
        this.updateCurrentDate();
    }

    displayRecentStudents() {
        const recentStudentsElement = document.getElementById('recent-students');
        if (!recentStudentsElement) return;

        const recentStudents = this.students.slice(-6).reverse();
        
        if (recentStudents.length === 0) {
            recentStudentsElement.innerHTML = `
                <div class="no-data">
                    <p>No students registered yet</p>
                </div>
            `;
            return;
        }

        recentStudentsElement.innerHTML = recentStudents.map(student => `
            <div class="recent-student" onclick="sms.showStudentDetails('${student.id}')">
                <div class="recent-student-avatar">
                    ${this.getInitials(student.name)}
                </div>
                <div class="recent-student-info">
                    <div class="recent-student-name">${this.escapeHtml(student.name)}</div>
                    <div class="recent-student-desk">Desk ${this.escapeHtml(student.deskNumber)}</div>
                </div>
            </div>
        `).join('');
    }

    getInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }

    displayStudents(studentsToShow) {
        const studentsList = document.getElementById('students-list');
        const noStudents = document.getElementById('no-students');

        if (!studentsList || !noStudents) return;

        if (studentsToShow.length === 0) {
            studentsList.style.display = 'none';
            noStudents.style.display = 'block';
            return;
        }

        studentsList.style.display = 'grid';
        noStudents.style.display = 'none';

        studentsList.innerHTML = studentsToShow.map(student => `
            <div class="student-card" onclick="sms.showStudentDetails('${student.id}')">
                <div class="student-name">${this.escapeHtml(student.name)}</div>
                <div class="student-info">
                    <span><i class="fas fa-envelope"></i> ${this.escapeHtml(student.email)}</span>
                    <span><i class="fas fa-phone"></i> ${this.escapeHtml(student.contact)}</span>
                    <span><i class="fas fa-desktop"></i> Desk: ${this.escapeHtml(student.deskNumber)}</span>
                    <span><i class="fas fa-graduation-cap"></i> ${this.escapeHtml(student.fieldOfStudy)}</span>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const totalStudents = this.students.length;
        const totalDesks = this.students.length;
        const totalRevenue = this.students.reduce((sum, student) => {
            return sum + student.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0);
        }, 0);

        // Update dashboard stats
        const totalStudentsEl = document.getElementById('total-students');
        const totalDesksEl = document.getElementById('total-desks');
        const totalRevenueEl = document.getElementById('total-revenue');
        
        if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
        if (totalDesksEl) totalDesksEl.textContent = totalDesks;
        if (totalRevenueEl) totalRevenueEl.textContent = `₹${totalRevenue.toLocaleString()}`;
    }

    updateAdminStats() {
        const totalStudents = this.students.length;
        const totalDesks = this.students.length;
        const monthlyRevenue = this.calculateMonthlyRevenue();

        const adminTotalStudents = document.getElementById('admin-total-students');
        const adminActiveDesks = document.getElementById('admin-active-desks');
        const adminMonthlyRevenue = document.getElementById('admin-monthly-revenue');
        
        if (adminTotalStudents) adminTotalStudents.textContent = totalStudents;
        if (adminActiveDesks) adminActiveDesks.textContent = totalDesks;
        if (adminMonthlyRevenue) adminMonthlyRevenue.textContent = `₹${monthlyRevenue.toLocaleString()}`;
    }

    calculateMonthlyRevenue() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return this.students.reduce((total, student) => {
            const monthlyPayments = student.payments.filter(payment => {
                const paymentDate = new Date(payment.date);
                return paymentDate.getMonth() === currentMonth && 
                       paymentDate.getFullYear() === currentYear;
            });
            
            return total + monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);
        }, 0);
    }

    searchStudents(query) {
        if (!query.trim()) {
            this.displayStudents(this.students);
            return;
        }

        const filtered = this.students.filter(student => {
            const searchTerm = query.toLowerCase();
            return (
                student.name.toLowerCase().includes(searchTerm) ||
                student.email.toLowerCase().includes(searchTerm) ||
                student.deskNumber.toLowerCase().includes(searchTerm) ||
                student.contact.includes(searchTerm)
            );
        });

        this.displayStudents(filtered);
    }

    showStudentDetails(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        this.currentStudentId = studentId;
        this.switchPage('student-detail');
        
        // Update page title
        const studentNameEl = document.getElementById('student-detail-name');
        if (studentNameEl) {
            studentNameEl.textContent = student.name;
        }
        
        // Display student details
        const detailsEl = document.getElementById('student-details');
        if (detailsEl) {
            detailsEl.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">${this.escapeHtml(student.name)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Contact:</span>
                    <span class="detail-value">${this.escapeHtml(student.contact)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${this.escapeHtml(student.email)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">${this.escapeHtml(student.address)}</span>
                </div>
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
            `;
        }

        this.displayPayments(student.payments);

        // Set today's date as default for payment form
        const paymentDateEl = document.getElementById('payment-date');
        if (paymentDateEl) {
            paymentDateEl.valueAsDate = new Date();
        }
    }

    displayPayments(payments) {
        const paymentList = document.getElementById('payment-list');
        const noPayments = document.getElementById('no-payments');

        if (!paymentList || !noPayments) return;

        if (payments.length === 0) {
            paymentList.style.display = 'none';
            noPayments.style.display = 'block';
            return;
        }

        paymentList.style.display = 'flex';
        noPayments.style.display = 'none';

        paymentList.innerHTML = payments.map(payment => `
            <div class="payment-item">
                <div class="payment-info">
                    <div class="payment-amount">₹${payment.amount.toLocaleString()}</div>
                    <div class="payment-date">${new Date(payment.date).toLocaleDateString()}</div>
                </div>
                <span class="payment-method">${this.escapeHtml(payment.method)}</span>
            </div>
        `).join('');
    }

    addPayment() {
        if (!this.currentStudentId) return;

        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        const payment = {
            id: Date.now().toString(),
            amount: parseInt(document.getElementById('payment-amount').value),
            date: document.getElementById('payment-date').value,
            method: document.getElementById('payment-method').value,
            timestamp: new Date().toISOString()
        };

        if (this.scriptUrl) {
            this.makeRequest('addPayment', { 
                studentId: this.currentStudentId, 
                payment: payment 
            })
            .then(response => {
                student.payments.push(payment);
                this.displayPayments(student.payments);
                this.updateStats();
                this.showMessage('Payment added successfully!', 'success');
                document.getElementById('payment-form').reset();
                const paymentDateEl = document.getElementById('payment-date');
                if (paymentDateEl) paymentDateEl.valueAsDate = new Date();
            })
            .catch(error => {
                this.showMessage('Failed to add payment: ' + error.message, 'error');
            });
        } else {
            student.payments.push(payment);
            this.saveLocalData();
            this.displayPayments(student.payments);
            this.updateStats();
            this.showMessage('Payment added successfully!', 'success');
            document.getElementById('payment-form').reset();
            const paymentDateEl = document.getElementById('payment-date');
            if (paymentDateEl) paymentDateEl.valueAsDate = new Date();
        }
    }

    updateMonthlyPayments() {
        const monthSelect = document.getElementById('payment-month');
        const yearSelect = document.getElementById('payment-year');
        
        if (!monthSelect || !yearSelect) return;

        const selectedMonth = parseInt(monthSelect.value);
        const selectedYear = parseInt(yearSelect.value);

        const monthlyPayments = [];
        const uniqueStudents = new Set();
        let totalAmount = 0;

        this.students.forEach(student => {
            student.payments.forEach(payment => {
                const paymentDate = new Date(payment.date);
                if (paymentDate.getMonth() === selectedMonth && 
                    paymentDate.getFullYear() === selectedYear) {
                    monthlyPayments.push({
                        studentName: student.name,
                        deskNumber: student.deskNumber,
                        amount: payment.amount,
                        method: payment.method,
                        date: payment.date
                    });
                    uniqueStudents.add(student.id);
                    totalAmount += payment.amount;
                }
            });
        });

        this.displayMonthlyPaymentsTable(monthlyPayments);
        this.updateMonthlySummary(monthlyPayments.length, totalAmount, uniqueStudents.size);
    }

    displayMonthlyPaymentsTable(payments) {
        const tableBody = document.getElementById('monthly-payments-list');
        const noPayments = document.getElementById('no-monthly-payments');

        if (!tableBody || !noPayments) return;

        if (payments.length === 0) {
            tableBody.parentElement.style.display = 'none';
            noPayments.style.display = 'block';
            return;
        }

        tableBody.parentElement.style.display = 'block';
        noPayments.style.display = 'none';

        tableBody.innerHTML = payments.map(payment => `
            <tr>
                <td>${this.escapeHtml(payment.studentName)}</td>
                <td>${this.escapeHtml(payment.deskNumber)}</td>
                <td>₹${payment.amount.toLocaleString()}</td>
                <td>${this.escapeHtml(payment.method)}</td>
                <td>${new Date(payment.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    updateMonthlySummary(totalPayments, totalAmount, uniqueStudents) {
        const totalPaymentsEl = document.getElementById('monthly-total-payments');
        const totalAmountEl = document.getElementById('monthly-total-amount');
        const uniqueStudentsEl = document.getElementById('monthly-unique-students');

        if (totalPaymentsEl) totalPaymentsEl.textContent = totalPayments;
        if (totalAmountEl) totalAmountEl.textContent = `₹${totalAmount.toLocaleString()}`;
        if (uniqueStudentsEl) uniqueStudentsEl.textContent = uniqueStudents;
    }

    updateDeskCharge() {
        const newCharge = parseInt(document.getElementById('current-charge').value);
        
        if (newCharge < 0) {
            this.showMessage('Desk charge cannot be negative!', 'error');
            return;
        }

        if (this.scriptUrl) {
            this.makeRequest('updateDeskCharge', { charge: newCharge })
                .then(response => {
                    this.deskCharge = newCharge;
                    this.setDeskChargeDisplay();
                    this.showMessage('Desk charge updated successfully!', 'success');
                })
                .catch(error => {
                    this.showMessage('Failed to update desk charge: ' + error.message, 'error');
                });
        } else {
            this.deskCharge = newCharge;
            localStorage.setItem('deskCharge', newCharge);
            this.setDeskChargeDisplay();
            this.showMessage('Desk charge updated successfully!', 'success');
        }
    }

    setDeskChargeDisplay() {
        const deskChargeEl = document.getElementById('desk-charge');
        const currentChargeEl = document.getElementById('current-charge');
        
        if (deskChargeEl) deskChargeEl.textContent = `₹${this.deskCharge}`;
        if (currentChargeEl) currentChargeEl.value = this.deskCharge;
    }

    exportData() {
        const data = {
            students: this.students,
            deskCharge: this.deskCharge,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-management-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('Data exported successfully!', 'success');
    }

    clearAllData() {
        if (this.scriptUrl) {
            this.showMessage('Clear all data not available in Google Sheets mode', 'error');
            return;
        }

        this.students = [];
        this.deskCharge = 500;
        this.saveLocalData();
        this.updateDashboard();
        this.setDeskChargeDisplay();
        
        this.showMessage('All data cleared successfully!', 'success');
    }

    saveLocalData() {
        localStorage.setItem('students', JSON.stringify(this.students));
        localStorage.setItem('deskCharge', this.deskCharge.toString());
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('message');
        if (!messageEl) return;

        messageEl.textContent = message;
        messageEl.className = `message ${type} show`;

        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the system
const sms = new StudentManagementSystem();
