// Student Management System JavaScript

class StudentManagementSystem {
    constructor() {
        this.students = JSON.parse(localStorage.getItem('students')) || [];
        this.deskCharge = parseInt(localStorage.getItem('deskCharge')) || 500;
        this.currentStudentId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDashboard();
        this.setDeskChargeDisplay();
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

        this.students.push(formData);
        this.saveData();
        this.updateDashboard();
        
        // Reset form
        document.getElementById('student-form').reset();
        
        this.showMessage('Student registered successfully!', 'success');
        this.switchPage('dashboard');
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

        student.payments.push(payment);
        this.saveData();
        this.displayPayments(student.payments);
        this.updateStats();

        // Reset payment form
        document.getElementById('payment-form').reset();
        document.getElementById('payment-date').valueAsDate = new Date();

        this.showMessage('Payment added successfully!', 'success');
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

        this.deskCharge = newCharge;
        localStorage.setItem('deskCharge', newCharge);
        this.setDeskChargeDisplay();
        
        this.showMessage('Desk charge updated successfully!', 'success');
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
        this.students = [];
        this.deskCharge = 500;
        this.saveData();
        this.updateDashboard();
        this.setDeskChargeDisplay();
        
        this.showMessage('All data cleared successfully!', 'success');
    }

    saveData() {
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
