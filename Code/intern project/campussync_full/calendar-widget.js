/* CampusSync — Calendar Widget + Reminders (Right Panel) */
(function () {
  'use strict';

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  // ─── Data: Holidays, Lectures, Long Weekends ───
  const holidays = {
    '2026-01-26': 'Republic Day',
    '2026-03-14': 'Holi',
    '2026-04-14': 'Ambedkar Jayanti',
    '2026-05-01': 'May Day',
    '2026-05-25': 'Buddha Purnima',
    '2026-06-15': 'Eid ul-Adha',
    '2026-08-15': 'Independence Day',
    '2026-10-02': 'Gandhi Jayanti',
    '2026-10-20': 'Dussehra',
    '2026-11-09': 'Diwali',
    '2026-11-10': 'Diwali Holiday',
    '2026-12-25': 'Christmas',
  };

  // Lecture schedule — days of week (0=Sun)
  const lectureSchedule = {
    1: ['CS301 · 9:30 AM', 'MATH202 · 11:30 AM'],                    // Mon
    2: ['CS302 · 10:00 AM', 'CS303 · 2:00 PM'],                      // Tue
    3: ['CS301 · 9:30 AM', 'CS302 · 11:30 AM'],                      // Wed
    4: ['MATH202 · 10:00 AM', 'CS301 · 2:00 PM'],                    // Thu
    5: ['CS303 · 9:30 AM'],                                           // Fri
  };

  // Long weekends (extended weekends around holidays)
  const longWeekends = [
    '2026-01-24', '2026-01-25',          // Republic Day weekend
    '2026-03-13', '2026-03-15',          // Holi weekend
    '2026-05-02', '2026-05-03',          // May Day weekend
    '2026-08-16', '2026-08-17',          // Independence Day
    '2026-10-19', '2026-10-21',          // Dussehra weekend
    '2026-11-08', '2026-11-11',          // Diwali weekend
    '2026-12-26', '2026-12-27',          // Christmas weekend
  ];

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const label = document.getElementById('calMonthYear');
    if (!grid || !label) return;

    const monthNames = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    let html = '';
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dayLabels.forEach(d => {
      html += `<div class="cal-day-label">${d}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(currentYear, currentMonth, d);
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      let classes = ['cal-day'];

      const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      if (isToday) classes.push('today');

      if (holidays[key]) {
        classes.push('holiday');
      } else if (longWeekends.includes(key)) {
        classes.push('long-weekend');
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        classes.push('weekend');
      } else if (lectureSchedule[dayOfWeek]) {
        classes.push('has-class');
      }

      const tooltip = holidays[key] || (longWeekends.includes(key) ? 'Long Weekend' : '');
      html += `<div class="${classes.join(' ')}" title="${tooltip}">${d}</div>`;
    }

    grid.innerHTML = html;
    renderReminders();
  }

  function renderReminders() {
    const list = document.getElementById('remindersList');
    if (!list) return;

    // Gather upcoming events in the next 14 days
    const today = new Date();
    const reminders = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      const dayOfWeek = d.getDay();

      if (holidays[key]) {
        reminders.push({ type: 'holiday', name: holidays[key], date: formatDate(d) });
      }
      if (longWeekends.includes(key)) {
        reminders.push({ type: 'holiday', name: 'Long Weekend', date: formatDate(d) });
      }
      if (i === 0 && lectureSchedule[dayOfWeek]) {
        lectureSchedule[dayOfWeek].forEach(lec => {
          reminders.push({ type: 'lecture', name: lec, date: 'Today' });
        });
      }
      if (i === 1 && lectureSchedule[dayOfWeek]) {
        lectureSchedule[dayOfWeek].forEach(lec => {
          reminders.push({ type: 'lecture', name: lec, date: 'Tomorrow' });
        });
      }
    }

    // Add exam reminders
    reminders.push({ type: 'exam', name: 'CS301 Midterm', date: '28 May 2026' });

    if (reminders.length === 0) {
      list.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding: 12px 0;">No upcoming reminders</p>';
      return;
    }

    // Limit to 6
    list.innerHTML = reminders.slice(0, 6).map(r => `
      <div class="reminder-item">
        <div class="reminder-dot ${r.type}"></div>
        <div class="reminder-info">
          <h5>${r.name}</h5>
          <p>${r.date}</p>
        </div>
      </div>
    `).join('');
  }

  function formatDate(d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
  }

  // Navigation
  document.addEventListener('DOMContentLoaded', function () {
    renderCalendar();

    const prev = document.getElementById('calPrev');
    const next = document.getElementById('calNext');

    if (prev) prev.addEventListener('click', function () {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    });

    if (next) next.addEventListener('click', function () {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });
  });
})();
