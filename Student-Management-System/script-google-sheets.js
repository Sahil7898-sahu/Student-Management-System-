// Student Management System JavaScript with Google Sheets Integration

class StudentManagementSystem {
    constructor() {
        this.students = [];
        this.deskCharge = 500;
        this.currentStudentId = null;
        this.scriptUrl = ''; // Will be set after setup
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadScriptUrl();
        this.updateDashboard();
    }

    loadScriptUrl() {
        // Try to get script URL from localStorage
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
                            <label for="script-url">Google Apps Script Web App URL:</label>
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
    }

    connectToGoogleSheets() {
        const urlInput = document.getElementById('script-url-input');
        if (!urlInput.value.trim()) {
            this.showMessage('Please enter the Google Apps Script URL', 'error');
            return;
        }

        this.scriptUrl = urlInput.value.trim();
        localStorage.setItem('googleScriptUrl', this.scriptUrl);
        
        // Test the connection
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
        
        // Load from localStorage
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
            // Load from localStorage
            this.students = JSON.parse(localStorage.getItem('students')) || [];
            this.deskCharge = parseInt(localStorage.getItem('deskCharge')) || 500;
            this.updateDashboard();
            this.setDeskChargeDisplay();
            return;
        }

        // Load from Google Sheets
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
            btn.addEventListener('click', (e) => this.switchPage(e.target.closest('.nav-btn').dataset.page));
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

        // Modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('student-modal').addEventListener('click', (e) => {
            if (e.target.id === 'student-modal') {
                this.closeModal();
            }
        });

        // Payment Form
        document.getElementById('payment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPayment();
        });
    }

    switchPage(pageId) {
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

        // Update dashboard when switching to it
        if (pageId === 'dashboard') {
            this.updateDashboard();
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

        // Validation
        if (!this.validateStudentData(formData)) {
            return;
        }

        // Check if desk number is already taken
        if (this.isDeskTaken(formData.deskNumber, formData.id)) {
            this.showMessage('Desk number is already taken!', 'error');
            return;
        }

        if (this.scriptUrl) {
            // Save to Google Sheets
            this.makeRequest('addStudent', { student: formData })
                .then(response => {
                    this.students.push(formData);
                    this.updateDashboard();
                    this.showMessage('Student registered successfully!', 'success');
                    document.getElementById('student-form').reset();
                    this.switchPage('dashboard');
                })
                .catch(error => {
                    this.showMessage('Failed to register student: ' + error.message, 'error');
                });
        } else {
            // Save to localStorage
            this.students.push(formData);
            this.saveLocalData();
            this.updateDashboard();
            this.showMessage('Student registered successfully!', 'success');
            document.getElementById('student-form').reset();
            this.switchPage('dashboard');
        }
    }

    validateStudentData(data) {
        if (!data.name || !data.contact || !data.email || !data.address || !data.fieldOfStudy || !data.deskNumber) {
            this.showMessage('Please fill in all required fields!', 'error');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showMessage('Please enter a valid email address!', 'error');
            return false;
        }

        // Phone validation
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
        this.displayStudents(this.students);
        this.updateStats();
    }

    displayStudents(studentsToShow) {
        const studentsList = document.getElementById('students-list');
        const noStudents = document.getElementById('no-students');

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

        document.getElementById('total-students').textContent = totalStudents;
        document.getElementById('total-desks').textContent = totalDesks;
        document.getElementById('total-revenue').textContent = `₹${totalRevenue.toLocaleString()}`;
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
        
        // Display student details
        document.getElementById('student-details').innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${this.escapeHtml(student.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Contact:</span>
                <span class="detail-value">${this.escapeHtml(student.contact)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${this.escapeHtml(student.email)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span class="detail-value">${this.escapeHtml(student.address)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Field of Study:</span>
                <span class="detail-value">${this.escapeHtml(student.fieldOfStudy)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Desk Number:</span>
                <span class="detail-value">${this.escapeHtml(student.deskNumber)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Registration Date:</span>
                <span class="detail-value">${new Date(student.registrationDate).toLocaleDateString()}</span>
            </div>
        `;

        // Display payment records
        this.displayPayments(student.payments);

        // Set today's date as default for payment form
        document.getElementById('payment-date').valueAsDate = new Date();

        // Show modal
        document.getElementById('student-modal').classList.add('show');
    }

    displayPayments(payments) {
        const paymentList = document.getElementById('payment-list');
        const noPayments = document.getElementById('no-payments');

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
            // Save to Google Sheets
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
                document.getElementById('payment-date').valueAsDate = new Date();
            })
            .catch(error => {
                this.showMessage('Failed to add payment: ' + error.message, 'error');
            });
        } else {
            // Save to localStorage
            student.payments.push(payment);
            this.saveLocalData();
            this.displayPayments(student.payments);
            this.updateStats();
            this.showMessage('Payment added successfully!', 'success');
            document.getElementById('payment-form').reset();
            document.getElementById('payment-date').valueAsDate = new Date();
        }
    }

    closeModal() {
        document.getElementById('student-modal').classList.remove('show');
        this.currentStudentId = null;
    }

    updateDeskCharge() {
        const newCharge = parseInt(document.getElementById('current-charge').value);
        
        if (newCharge < 0) {
            this.showMessage('Desk charge cannot be negative!', 'error');
            return;
        }

        if (this.scriptUrl) {
            // Update in Google Sheets
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
            // Update in localStorage
            this.deskCharge = newCharge;
            localStorage.setItem('deskCharge', newCharge);
            this.setDeskChargeDisplay();
            this.showMessage('Desk charge updated successfully!', 'success');
        }
    }

    setDeskChargeDisplay() {
        document.getElementById('desk-charge').textContent = `₹${this.deskCharge}`;
        document.getElementById('current-charge').value = this.deskCharge;
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
            // Clear from Google Sheets (would need to implement this in the script)
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
