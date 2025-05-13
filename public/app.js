
(function authGuard() {
  const username = localStorage.getItem('username');
  const current = window.location.pathname.split('/').pop(); 

  
  const authPages = ['', 'login.html', 'register.html']; 
  const isAuthPage = authPages.includes(current);
  const isIndexPage = current === 'index.html';

  if (!username && isIndexPage) {
    window.location.replace('register.html');
    return; 
  }

  if (username && isAuthPage) {
    window.location.replace('index.html');
    return;
  }
})();

const lookForm   = document.getElementById('lookForm');
const previewGrid = document.getElementById('lookGrid');
const uname      = localStorage.getItem('username');   


async function loadLooks () {
  if (!uname) return;                       
  try {
    const res  = await fetch(`http://localhost:5001/looks/${encodeURIComponent(uname)}`);
    const { data: looks = [] } = await res.json();

    previewGrid.innerHTML = looks.map(l => `
      <div class="look-item">
        <img src="${l.photoUrl}" alt="Uploaded Look"
             style="width:100px;height:100px;object-fit:cover;">
        <div>Tags: ${Array.isArray(l.tags) ? l.tags.join(', ') : l.tags}</div>
        <div>Notes: ${l.notes || ''}</div>
        <small>${new Date(l.createdAt).toLocaleString()}</small>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading looks:', err);
  }
}


loadLooks();

if (lookForm) {
  lookForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    formData.append('username', uname);     

    try {
      
      await fetch('http://localhost:5001/upload-look', {
        method: 'POST',
        body: formData
      });

      
      await loadLooks();
      lookForm.reset();                     
    } catch (err) {
      console.error('Error uploading look:', err);
    }
  });
}

// ────────────────────────────────
// Registration
// ────────────────────────────────
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    try {
      const res = await fetch('http://localhost:5001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = 'login.html';
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Error during registration:', err);
      alert('An error occurred during registration.');
    }
  });
}


const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('http://localhost:5001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('username', username);
        window.location.href = 'index.html';
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Error during login:', err);
      alert('An error occurred during login.');
    }
  });
}

// ────────────────────────────────
// Logout (exists only on index.html)
// ────────────────────────────────
const logoutBtn = document.getElementById('logoutButton');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('username');
    window.location.href = 'login.html';
  });
}
