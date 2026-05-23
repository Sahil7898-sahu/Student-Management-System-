// Hybrid Storage System - Google Sheets + Local Storage
class HybridStudentSystem {
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
        this.initializeMonthYearSelectors();
        this.loadLocalData(); // Always load local data first
    }

    loadScriptUrl() {
        this.scriptUrl = localStorage.getItem('googleScriptUrl') || '';
        if (this.scriptUrl) {
            this.testConnection();
        }
    }

    async testConnection() {
        try {
            const response = await this.makeRequest('getDeskCharge');
            if (response.status === 'success') {
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
            if (response.status === 'success') {
                const googleStudents = response.data || [];
                // Merge with local data (Google Sheets takes precedence)
                this.students = googleStudents;
                this.saveLocalData(); // Save to local storage
                this.updateDashboard();
            }
        } catch (error) {
            console.log('Sync failed, using local data');
        }
    }

    loadLocalData() {
        try {
            const localData = localStorage.getItem('students');
            const localCharge = localStorage.getItem('deskCharge');
            
            if (localData) this.students = JSON.parse(localData);
            if (localCharge) this.deskCharge = parseInt(localCharge);
            
            this.updateDashboard();
            this.setDeskChargeDisplay();
        } catch (error) {
            this.students = [];
            this.deskCharge = 500;
        }
    }

    saveLocalData() {
        localStorage.setItem('students', JSON.stringify(this.students));
        localStorage.setItem('deskCharge', this.deskCharge.toString());
    }

    async saveToBoth(studentData) {
        // Save to local storage immediately
        this.students.push(studentData);
        this.saveLocalData();
        
        // Try to save to Google Sheets
        if (this.isOnline) {
            try {
                await this.makeRequest('addStudent', { student: studentData });
                this.showMessage('✅ Saved to both local storage and Google Sheets!', 'success');
            } catch (error) {
                this.showMessage('⚠️ Saved locally, Google Sheets sync failed', 'warning');
            }
        } else {
            this.showMessage('✅ Saved to local storage only', 'success');
        }
    }

    async makeRequest(action, data = {}) {
        if (!this.scriptUrl) throw new Error('No Google Sheets URL');
        
        const formData = new FormData();
        formData.append('action', action);
        if (data.student) formData.append('student', JSON.stringify(data.student));
        if (data.studentId) formData.append('studentId', data.studentId);
        if (data.payment) formData.append('payment', JSON.stringify(data.payment));
        if (data.charge !== undefined) formData.append('charge', data.charge);

        const response = await fetch(this.scriptUrl, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }

    registerStudent() {
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

        if (!this.validateStudent(student)) return;
        if (this.isDeskTaken(student.deskNumber, student.id)) {
            this.showMessage('Desk already taken!', 'error');
            return;
        }

        this.saveToBoth(student);
        document.getElementById('student-form').reset();
        this.switchPage('students');
    }

    validateStudent(data) {
        if (!data.name || !data.contact || !data.email || !data.deskNumber) {
            this.showMessage('Fill all required fields!', 'error');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            this.showMessage('Invalid email!', 'error');
            return false;
        }
        if (!/^[0-9]{10}$/.test(data.contact)) {
            this.showMessage('Invalid phone number!', 'error');
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

    exportData() {
        const exportType = confirm('Export as PDF (table format)?\n\nOK = PDF\nCancel = JSON (original format)');
        
        if (exportType) {
            this.exportToPDF();
        } else {
            this.exportToJSON();
        }
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.setTextColor(26, 54, 93); // Primary color
        doc.text('Student Management System Report', 105, 20, { align: 'center' });
        
        // Add export date
        doc.setFontSize(12);
        doc.setTextColor(113, 128, 150); // Secondary color
        doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        // Add sync status
        doc.setFontSize(10);
        doc.text(`Sync Status: ${this.isOnline ? 'Online (Google Sheets + Local)' : 'Offline (Local Only)'}`, 105, 38, { align: 'center' });
        
        // Add summary section
        doc.setFontSize(14);
        doc.setTextColor(26, 54, 93);
        doc.text('Summary', 20, 55);
        
        doc.setFontSize(10);
        doc.setTextColor(45, 55, 72);
        doc.text(`Total Students: ${this.students.length}`, 20, 65);
        doc.text(`Desk Charge: ₹${this.deskCharge}`, 20, 72);
        doc.text(`Total Revenue: ₹${this.students.reduce((sum, student) => sum + student.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0).toLocaleString()}`, 20, 79);
        
        // Add student table
        doc.setFontSize(14);
        doc.setTextColor(26, 54, 93);
        doc.text('Student Details', 20, 95);
        
        // Table headers
        const headers = ['Name', 'Contact', 'Email', 'Desk', 'Field', 'Reg. Date'];
        const headerX = [20, 60, 100, 140, 160, 180];
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(26, 54, 93); // Primary color background
        
        headers.forEach((header, index) => {
            doc.rect(headerX[index], 105, headerX[index + 1] ? headerX[index + 1] - headerX[index] - 2 : 30, 8, 'F');
            doc.text(header, headerX[index] + 1, 110);
        });
        
        // Table data
        doc.setTextColor(45, 55, 72);
        doc.setFontSize(8);
        
        let yPosition = 118;
        this.students.forEach((student, index) => {
            if (yPosition > 270) { // New page if needed
                doc.addPage();
                yPosition = 20;
                
                // Add headers on new page
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(26, 54, 93);
                headers.forEach((header, headerIndex) => {
                    doc.rect(headerX[headerIndex], yPosition, headerX[headerIndex + 1] ? headerX[headerIndex + 1] - headerX[headerIndex] - 2 : 30, 8, 'F');
                    doc.text(header, headerX[headerIndex] + 1, yPosition + 5);
                });
                yPosition += 10;
                doc.setTextColor(45, 55, 72);
                doc.setFontSize(8);
            }
            
            // Student data
            doc.text(this.truncateText(student.name, 15), headerX[0] + 1, yPosition);
            doc.text(student.contact, headerX[1] + 1, yPosition);
            doc.text(this.truncateText(student.email, 20), headerX[2] + 1, yPosition);
            doc.text(student.deskNumber, headerX[3] + 1, yPosition);
            doc.text(this.truncateText(student.fieldOfStudy, 8), headerX[4] + 1, yPosition);
            doc.text(new Date(student.registrationDate).toLocaleDateString(), headerX[5] + 1, yPosition);
            
            yPosition += 8;
        });
        
        // Add payment summary if space allows
        if (yPosition < 250) {
            doc.addPage();
            doc.setFontSize(14);
            doc.setTextColor(26, 54, 93);
            doc.text('Complete Payment History', 20, 20);
            
            // Payment table headers
            const paymentHeaders = ['Student Name', 'Desk', 'Total Paid', 'Payment Count', 'Last Payment'];
            const paymentHeaderX = [20, 70, 110, 140, 170];
            
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.setFillColor(16, 185, 129); // Success color
            
            paymentHeaders.forEach((header, index) => {
                doc.rect(paymentHeaderX[index], 30, paymentHeaderX[index + 1] ? paymentHeaderX[index + 1] - paymentHeaderX[index] - 2 : 40, 8, 'F');
                doc.text(header, paymentHeaderX[index] + 1, 35);
            });
            
            // Payment data
            doc.setTextColor(45, 55, 72);
            doc.setFontSize(8);
            let paymentY = 43;
            
            this.students.forEach(student => {
                const studentPayments = student.payments || [];
                const totalPaid = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);
                const paymentCount = studentPayments.length;
                const lastPayment = studentPayments.length > 0 ? 
                    new Date(studentPayments[studentPayments.length - 1].date).toLocaleDateString() : 'No payments';
                
                if (paymentY > 270) {
                    doc.addPage();
                    paymentY = 20;
                    
                    // Add headers on new page
                    doc.setFontSize(10);
                    doc.setTextColor(255, 255, 255);
                    doc.setFillColor(16, 185, 129);
                    paymentHeaders.forEach((header, headerIndex) => {
                        doc.rect(paymentHeaderX[headerIndex], paymentY, paymentHeaderX[headerIndex + 1] ? paymentHeaderX[headerIndex + 1] - paymentHeaderX[headerIndex] - 2 : 40, 8, 'F');
                        doc.text(header, paymentHeaderX[headerIndex] + 1, paymentY + 5);
                    });
                    paymentY += 10;
                    doc.setTextColor(45, 55, 72);
                    doc.setFontSize(8);
                }
                
                doc.text(this.truncateText(student.name, 22), paymentHeaderX[0] + 1, paymentY);
                doc.text(student.deskNumber, paymentHeaderX[1] + 1, paymentY);
                doc.text(`₹${totalPaid.toLocaleString()}`, paymentHeaderX[2] + 1, paymentY);
                doc.text(paymentCount.toString(), paymentHeaderX[3] + 1, paymentY);
                doc.text(lastPayment, paymentHeaderX[4] + 1, paymentY);
                
                paymentY += 8;
            });
        }
        
        // Add detailed payment breakdown for each student
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(26, 54, 93);
        doc.text('Detailed Payment Records', 20, 20);
        
        let detailY = 35;
        this.students.forEach((student, studentIndex) => {
            if (detailY > 260) {
                doc.addPage();
                detailY = 20;
            }
            
            // Student header
            doc.setFontSize(12);
            doc.setTextColor(26, 54, 93);
            doc.text(`${student.name} (Desk: ${student.deskNumber})`, 20, detailY);
            detailY += 10;
            
            // Payment details
            const studentPayments = student.payments || [];
            if (studentPayments.length === 0) {
                doc.setFontSize(9);
                doc.setTextColor(113, 128, 150);
                doc.text('No payments recorded', 25, detailY);
                detailY += 8;
            } else {
                // Payment headers for this student
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(49, 130, 206); // Accent color
                
                const detailHeaders = ['Date', 'Amount', 'Method'];
                const detailHeaderX = [25, 80, 120];
                
                detailHeaders.forEach((header, index) => {
                    doc.rect(detailHeaderX[index], detailY, detailHeaderX[index + 1] ? detailHeaderX[index + 1] - detailHeaderX[index] - 2 : 70, 6, 'F');
                    doc.text(header, detailHeaderX[index] + 1, detailY + 4);
                });
                detailY += 8;
                
                // Payment records
                doc.setTextColor(45, 55, 72);
                doc.setFontSize(8);
                
                studentPayments.forEach(payment => {
                    if (detailY > 270) {
                        doc.addPage();
                        detailY = 20;
                        
                        // Re-add student name on new page
                        doc.setFontSize(10);
                        doc.setTextColor(26, 54, 93);
                        doc.text(`${student.name} (continued)`, 20, detailY);
                        detailY += 8;
                        
                        // Re-add headers
                        doc.setFontSize(9);
                        doc.setTextColor(255, 255, 255);
                        doc.setFillColor(49, 130, 206);
                        detailHeaders.forEach((header, index) => {
                            doc.rect(detailHeaderX[index], detailY, detailHeaderX[index + 1] ? detailHeaderX[index + 1] - detailHeaderX[index] - 2 : 70, 6, 'F');
                            doc.text(header, detailHeaderX[index] + 1, detailY + 4);
                        });
                        detailY += 8;
                        doc.setTextColor(45, 55, 72);
                        doc.setFontSize(8);
                    }
                    
                    doc.text(new Date(payment.date).toLocaleDateString(), detailHeaderX[0] + 1, detailY);
                    doc.text(`₹${payment.amount.toLocaleString()}`, detailHeaderX[1] + 1, detailY);
                    doc.text(payment.method, detailHeaderX[2] + 1, detailY);
                    
                    detailY += 6;
                });
                
                // Total for this student
                const studentTotal = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);
                doc.setFontSize(9);
                doc.setTextColor(16, 185, 129);
                doc.text(`Total: ₹${studentTotal.toLocaleString()}`, 25, detailY);
                detailY += 10;
            }
            
            // Add spacing between students
            detailY += 5;
        });
        
        // Save the PDF
        doc.save(`student-management-report-${new Date().toISOString().split('T')[0]}.pdf`);
        this.showMessage('✅ PDF report exported successfully!', 'success');
    }

    exportToJSON() {
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
        a.download = `hybrid-student-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showMessage('✅ JSON data exported successfully!', 'success');
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    connectToGoogleSheets() {
        const url = prompt('Enter Google Sheets Web App URL:');
        if (!url) return;

        if (!url.includes('script.google.com') || !url.includes('/exec')) {
            this.showMessage('Invalid URL format!', 'error');
            return;
        }

        this.scriptUrl = url;
        localStorage.setItem('googleScriptUrl', url);
        this.testConnection();
    }

    updateSyncStatus() {
        const statusEl = document.getElementById('sync-status');
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
    }

    // Other methods (navigation, dashboard, etc.) remain the same
    switchPage(pageId) {
        this.currentPage = pageId;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        
        if (pageId === 'dashboard') this.updateDashboard();
        if (pageId === 'payment-table') this.updatePaymentTable();
        if (pageId === 'admin') this.updateAdminStats();
    }

    updateDashboard() {
        this.displayRecentStudents();
        this.updateStats();
    }

    updateStats() {
        const totalStudents = this.students.length;
        const totalRevenue = this.students.reduce((sum, student) => 
            sum + student.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
        
        document.getElementById('total-students').textContent = totalStudents;
        document.getElementById('total-revenue').textContent = `₹${totalRevenue.toLocaleString()}`;
        document.getElementById('total-desks').textContent = totalStudents;
    }
        

    displayRecentStudents() {
        const container = document.getElementById('recent-students');
        const recent = this.students.slice(-6).reverse();
        
        if (recent.length === 0) {
            container.innerHTML = '<p>No students registered yet</p>';
            return;
        }

        container.innerHTML = recent.map(student => `
            <div class="recent-student">
                <div class="student-avatar">${student.name.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                <div>
                    <div>${student.name}</div>
                    <small>Desk ${student.deskNumber}</small>
                </div>
            </div>
        `).join('');
    }

    displayStudents() {
        const studentsList = document.getElementById('students-list');
        const noStudents = document.getElementById('no-students');

        if (!studentsList || !noStudents) return;

        if (this.students.length === 0) {
            studentsList.style.display = 'none';
            noStudents.style.display = 'block';
            return;
        }

        studentsList.style.display = 'grid';
        noStudents.style.display = 'none';

        studentsList.innerHTML = this.students.map(student => `
            <div class="student-card" onclick="hybrid.showStudentDetails('${student.id}')">
                <div class="student-name">${this.escapeHtml(student.name)}</div>
                <div class="student-info">
                    <span><i class="fas fa-desktop"></i> Desk: ${this.escapeHtml(student.deskNumber)}</span>
                    <span><i class="fas fa-envelope"></i> ${this.escapeHtml(student.email)}</span>
                    <span><i class="fas fa-phone"></i> ${this.escapeHtml(student.contact)}</span>
                    <span><i class="fas fa-graduation-cap"></i> ${this.escapeHtml(student.fieldOfStudy)}</span>
                </div>
                <div class="student-preview">
                    <span class="click-hint">Click for details →</span>
                </div>
            </div>
        `).join('');
    }

    showStudentDetails(studentId) {
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
                    <h3>Student Details - ${student.name}</h3>
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

                        <!-- Payment History -->
                        <div class="detail-section">
                            <h4><i class="fas fa-history"></i> Payment History</h4>
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
                                <button class="btn-primary" onclick="hybrid.showAdminPaymentModal('${student.id}')">
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
    }

    initializeMonthYearSelectors() {
        const monthSelect = document.getElementById('payment-month');
        const yearSelect = document.getElementById('payment-year');
        
        if (monthSelect) {
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
        }
        
        if (yearSelect) {
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

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.closest('.nav-btn').dataset.page;
                this.switchPage(page);
            });
        });

        const studentForm = document.getElementById('student-form');
        if (studentForm) {
            studentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registerStudent();
            });
        }

        const connectBtn = document.getElementById('connect-google');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectToGoogleSheets());
        }

        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type} show`;
            setTimeout(() => messageEl.classList.remove('show'), 3000);
        }
    }

    setDeskChargeDisplay() {
        const deskChargeEl = document.getElementById('desk-charge');
        if (deskChargeEl) deskChargeEl.textContent = `₹${this.deskCharge}`;
    }

    async addPayment(studentId, paymentData) {
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
                await this.makeRequest('addPayment', { studentId, payment: paymentData });
                this.showMessage('✅ Payment added to both storages!', 'success');
            } catch (error) {
                this.showMessage('⚠️ Payment saved locally, cloud sync failed', 'warning');
            }
        } else {
            this.showMessage('✅ Payment saved locally', 'success');
        }

        this.updateDashboard();
        
        // Force update payment table
        setTimeout(() => {
            this.updatePaymentTable();
            console.log('Payment table force updated after adding payment');
        }, 100);
    }

    showAdminPaymentModal(studentId) {
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
                                <i class="fas fa-plus"></i> Add Current Month Payment
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
                timestamp: new Date().toISOString(),
                currentMonth: currentMonth
            };
            
            this.addPayment(studentId, paymentData);
            modal.remove();
        });
    }

    updatePaymentTable() {
        const tableBody = document.getElementById('payment-table-body');
        const noData = document.getElementById('no-payment-data');
        
        if (!tableBody) return;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        console.log('Updating payment table for', this.students.length, 'students');
        
        if (this.students.length === 0) {
            if (tableBody) tableBody.parentElement.style.display = 'none';
            if (noData) noData.style.display = 'block';
            return;
        }

        const tableRows = this.students.map(student => {
            // Get all payments for current month
            const currentMonthPayments = student.payments ? student.payments.filter(payment => {
                try {
                    const paymentDate = new Date(payment.date);
                    return paymentDate.getMonth() === currentMonth && 
                           paymentDate.getFullYear() === currentYear;
                } catch(e) {
                    return false;
                }
            }) : [];
            
            // Find the latest payment from current month
            let latestPaymentAmount = 0;
            let latestPaymentDate = null;
            let latestPaymentMethod = 'No payment';
            
            if (currentMonthPayments.length > 0) {
                // Sort payments by date (newest first)
                const sortedPayments = currentMonthPayments.sort((a, b) => {
                    try {
                        return new Date(b.date) - new Date(a.date);
                    } catch(e) {
                        return 0;
                    }
                });
                
                latestPaymentAmount = sortedPayments[0].amount;
                latestPaymentDate = sortedPayments[0].date;
                latestPaymentMethod = sortedPayments[0].method;
            }
            
            console.log(`Student ${student.name}: Latest payment = ₹${latestPaymentAmount} (${latestPaymentMethod})`);
            
            return `
                <tr>
                    <td>${this.escapeHtml(student.name)}</td>
                    <td>${this.escapeHtml(student.deskNumber)}</td>
                    <td>
                        <span class="payment-amount ${latestPaymentAmount > 0 ? 'has-payment' : 'no-payment'}">
                            ₹${latestPaymentAmount.toLocaleString()}
                        </span>
                        ${latestPaymentAmount > 0 ? `
                            <br><span class="payment-method">${latestPaymentMethod}</span>
                        ` : ''}
                        ${latestPaymentDate ? `<br><small class="payment-date">${new Date(latestPaymentDate).toLocaleDateString()}</small>` : ''}
                    </td>
                    <td>
                        <button class="btn-primary btn-sm" onclick="hybrid.showAdminPaymentModal('${student.id}')">
                            <i class="fas fa-plus"></i> Add Payment
                        </button>
                    </td>
                    <td>
                        <button class="btn-secondary btn-sm" onclick="hybrid.viewPaymentHistory('${student.id}')">
                            <i class="fas fa-history"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });

        if (tableBody) {
            tableBody.parentElement.style.display = 'block';
            if (noData) noData.style.display = 'none';
            tableBody.innerHTML = tableRows.join('');
        }
        
        console.log('Payment table updated successfully');
    }

    viewPaymentHistory(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Payment History - ${student.name}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <h4>Desk: ${student.deskNumber}</h4>
                    <div class="payment-history-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${student.payments && student.payments.length > 0 ? 
                                    student.payments.map(payment => `
                                        <tr>
                                            <td>${new Date(payment.date).toLocaleDateString()}</td>
                                            <td>₹${payment.amount.toLocaleString()}</td>
                                            <td>${payment.method}</td>
                                        </tr>
                                    `).join('') : 
                                    '<tr><td colspan="3">No payments recorded</td></tr>'
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="form-actions">
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    updateAdminStats() {
        const adminStudents = document.getElementById('admin-total-students');
        const googleStatus = document.getElementById('google-sheets-status');
        
        if (adminStudents) adminStudents.textContent = this.students.length;
        if (googleStatus) {
            googleStatus.textContent = this.isOnline ? '🟢 Connected' : '🟡 Not Connected';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.hybrid = new HybridStudentSystem();
});
