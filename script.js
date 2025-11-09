/**
 * !!!!!!!!!!!!!!!!!!
 * !! INSTRUCTIONS !!
 * !!!!!!!!!!!!!!!!!!
 *
 * 1. Créez un compte gratuit sur https://supabase.com
 * 2. Créez un nouveau projet.
 * 3. Allez dans "Project Settings" > "API".
 * 4. Copiez votre "Project URL" et votre "anon" "public" key.
 * 5. Collez-les ci-dessous :
 */
const SUPABASE_URL = 'https://osfkcukxcxcpeeyvibgt.supabase.co'; // Ex: 'https://xyz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZmtjdWt4Y3hjcGVleXZpYmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDMwOTUsImV4cCI6MjA3ODI3OTA5NX0.0UUaNGFWEDSOIMQqg5Qjw-5SQ_dvMuKq8l0GZR-ojFk';  // Ex: 'eyJh...XYZ'

// Créez le client Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

class LibraryApp {
  constructor() {
    // État de l'application
    this.books = [];
    this.categories = [];
    this.user = null;
    this.currentPage = 'home';
    
    // Éléments du DOM
    this.dom = {
      booksGrid: document.getElementById('booksGrid'),
      categoriesGrid: document.getElementById('categoriesGrid'),
      categoryFilter: document.getElementById('categoryFilter'),
      sortFilter: document.getElementById('sortFilter'),
      searchInput: document.getElementById('searchInput'),
      
      // Authentification
      loginBtn: document.getElementById('login-btn'),
      logoutBtn: document.getElementById('logout-btn'),
      userInfo: document.getElementById('user-info'),
      userEmail: document.getElementById('user-email'),
      uploadNavLink: document.getElementById('upload-nav-link'),
      authModal: document.getElementById('auth-modal'),
      authClose: document.getElementById('auth-close'),
      authView: document.getElementById('auth-view'),
      
      // Modals
      bookModal: document.getElementById('bookModal'),
      bookDetails: document.getElementById('bookDetails'),
      bookModalClose: document.querySelector('#bookModal .close'),
      
      // Formulaires
      uploadForm: document.getElementById('uploadForm'),
      uploadMessage: document.getElementById('uploadMessage'),
      uploadBtn: document.getElementById('upload-submit-btn'),
    };
    
    this.initializeApp();
  }

  async initializeApp() {
    this.setupEventListeners();
    await this.checkUser();
    this.setupNavigation();
    
    // Charger les données initiales
    await this.loadCategories();
    await this.loadBooks();
  }

  // ===================================================================
  // AUTHENTIFICATION (Nouvelle section)
  // ===================================================================
  
  /**
   * Vérifie la session utilisateur au chargement
   */
  async checkUser() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
      this.user = session.user;
    } else {
      this.user = null;
    }
    this.updateAuthUI();
  }

  /**
   * Met à jour l'interface en fonction de l'état de connexion
   */
  updateAuthUI() {
    if (this.user) {
      this.dom.loginBtn.classList.add('hidden');
      this.dom.userInfo.style.display = 'flex';
      this.dom.uploadNavLink.style.display = 'block';
      this.dom.userEmail.textContent = this.user.email;
    } else {
      this.dom.loginBtn.classList.remove('hidden');
      this.dom.userInfo.style.display = 'none';
      this.dom.uploadNavLink.style.display = 'none';
      this.dom.userEmail.textContent = '';
      
      // Si l'utilisateur est sur la page d'upload et se déconnecte, le renvoyer à l'accueil
      if (this.currentPage === 'upload') {
        this.showPage('home');
      }
    }
  }

  /**
   * Affiche le modal d'authentification (login ou signup)
   */

  
  closeAuthModal() {
    this.dom.authModal.style.display = 'none';
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msgDiv = document.getElementById('authMessage');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      msgDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
    } else {
      this.user = data.user;
      this.updateAuthUI();
      this.closeAuthModal();
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const msgDiv = document.getElementById('authMessage');

    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      msgDiv.innerHTML = `<div class="error-message">${error.message}</div>`;
    } else {
      msgDiv.innerHTML = `<div class="success-message">Inscription réussie ! Veuillez vérifier vos emails pour confirmer votre compte.</div>`;
    }
  }

  async handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    } else {
      this.user = null;
      this.updateAuthUI();
    }
  }

  // ===================================================================
  // GESTION DES DONNÉES (Adaptée à Supabase)
  // ===================================================================
  
  async loadBooks() {
    this.dom.booksGrid.innerHTML = '<div class="loader">Chargement des livres...</div>';
    
    // 'books' est le nom de votre table dans Supabase
    // .order() trie les plus récents d'abord
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Erreur loadBooks:', error);
      this.dom.booksGrid.innerHTML = '<p class="no-books">Erreur lors du chargement des livres.</p>';
      return;
    }
    
    this.books = data;
    this.filterBooks(); // Affiche les livres après filtrage/tri initial
  }

  async loadCategories() {
    // Dans Supabase, il est plus efficace de faire un "distinct" sur la table des livres
    const { data, error } = await supabase
      .from('books')
      .select('category');

    if (error) {
      console.error('Erreur loadCategories:', error);
      return;
    }

    // Extrait les catégories uniques et non-nulles
    const uniqueCategories = [...new Set(data.map(book => book.category).filter(Boolean))];
    this.categories = uniqueCategories.sort();
    
    this.populateCategoryFilters();
  }

  populateCategoryFilters() {
    this.dom.categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>';
    
    this.categories.forEach(category => {
      const option = new Option(category, category);
      this.dom.categoryFilter.add(option);
    });
  }

  // ===================================================================
  // UPLOAD (Adapté à Supabase)
  // ===================================================================

  async handleUpload(e) {
    e.preventDefault();
    
    if (!this.user) {
      this.showMessage(this.dom.uploadMessage, 'Vous devez être connecté pour uploader un livre.', 'error');
      return;
    }
    
    this.dom.uploadBtn.disabled = true;
    this.dom.uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload en cours...';
    
    const form = e.target;
    const formData = new FormData(form);
    const file = formData.get('file');
    
    if (file.size > 10 * 1024 * 1024) { // Limite 10MB
      this.showMessage(this.dom.uploadMessage, 'Fichier trop volumineux (Max 10MB).', 'error');
      this.dom.uploadBtn.disabled = false;
      this.dom.uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Uploader le livre';
      return;
    }
    
    try {
      // 1. Uploader le fichier dans le "Storage"
      // 'book-files' est le nom de votre "Bucket" Supabase
      const fileExt = file.name.split('.').pop();
      const filePath = `public/${Date.now()}-${Math.random() * 1E9}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('book-files') // Nom du Bucket
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insérer les métadonnées dans la base de données
      const newBook = {
        title: formData.get('title'),
        author: formData.get('author'),
        category: formData.get('category') || 'Non catégorisé',
        publication_date: formData.get('publicationDate') || null,
        description: formData.get('description') || '',
        file_path: filePath, // Chemin dans le Storage
        file_size_mb: (file.size / (1024 * 1024)).toFixed(2),
        uploader_id: this.user.id, // Lier à l'utilisateur connecté
        download_count: 0
        // 'created_at' et 'id' sont gérés par Supabase
      };

      const { error: insertError } = await supabase
        .from('books') // Nom de la table
        .insert(newBook);
        
      if (insertError) throw insertError;

      // 3. Succès
      this.showMessage(this.dom.uploadMessage, 'Livre ajouté avec succès !', 'success');
      form.reset();
      
      // Recharger les données
      await this.loadCategories(); // Mettre à jour la liste des catégories
      await this.loadBooks();
      
      setTimeout(() => this.showPage('home'), 2000);

    } catch (error) {
      console.error('Erreur upload:', error);
      this.showMessage(this.dom.uploadMessage, `Erreur lors de l'upload: ${error.message}`, 'error');
    } finally {
      this.dom.uploadBtn.disabled = false;
      this.dom.uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Uploader le livre';
    }
  }

  // ===================================================================
  // TÉLÉCHARGEMENT (Adapté à Supabase)
  // ===================================================================

  async downloadBook(bookId, buttonElement) {
    if (!this.user) {
      alert('Vous devez être connecté pour télécharger un livre.');
      return;
    }

    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Préparation...';

    const book = this.books.find(b => b.id == bookId);
    if (!book) return;

    try {
      // 1. Obtenir une URL de téléchargement signée (valable 60s)
      const { data, error } = await supabase.storage
        .from('book-files') // Nom du Bucket
        .createSignedUrl(book.file_path, 60, {
          download: true // Force le téléchargement vs affichage
        });

      if (error) throw error;
      
      // 2. Incrémenter le compteur de téléchargements dans la BDD
      // C'est une fonction "RPC" de Supabase (à créer) pour la sécurité
      // C'est plus sûr que de le faire côté client, mais pour l'instant :
      const { error: rpcError } = await supabase.rpc('increment_download_count', {
        book_id_to_increment: book.id
      });
      
      if (rpcError) console.warn("Erreur RPC (vous devez créer la fonction):", rpcError);
      
      // 3. Lancer le téléchargement
      window.open(data.signedUrl, '_blank');
      
      // Mettre à jour localement (ou recharger)
      book.download_count++;
      this.closeModal();
      
      // Recharger la liste pour voir le compteur mis à jour
      await this.loadBooks();

    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      alert('Erreur lors du téléchargement: ' + error.message);
      buttonElement.disabled = false;
      buttonElement.innerHTML = '<i class="fas fa-download"></i> Télécharger';
    }
  }

  // ===================================================================
  // Logique d'affichage (Peu modifiée)
  // ===================================================================
  
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          this.showPage(href.substring(1));
        }
      });
    });

    // Filtres
    this.dom.categoryFilter.addEventListener('change', () => this.filterBooks());
    this.dom.sortFilter.addEventListener('change', () => this.filterBooks());
    this.dom.searchInput.addEventListener('input', () => this.filterBooks());
    document.getElementById('searchBtn').addEventListener('click', () => this.filterBooks());

    // Upload
    this.dom.uploadForm.addEventListener('submit', (e) => this.handleUpload(e));

    // Modals
    this.dom.bookModalClose.addEventListener('click', () => this.closeModal());
    this.dom.authClose.addEventListener('click', () => this.closeAuthModal());
    window.addEventListener('click', (e) => {
      if (e.target === this.dom.bookModal) this.closeModal();
      if (e.target === this.dom.authModal) this.closeAuthModal();
    });
    
    // Auth
    this.dom.loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showAuthModal('login');
    });
    this.dom.logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleLogout();
    });
  }

  setupNavigation() {
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.substring(1) || 'home';
      this.showPage(page);
    });
    const initialPage = window.location.hash.substring(1) || 'home';
    this.showPage(initialPage);
  }

  showPage(pageName) {
    if (pageName === 'upload' && !this.user) {
      this.showPage('home'); // Redirige si non connecté
      this.showAuthModal('login'); // Ouvre le modal de connexion
      return;
    }
  
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${pageName}`);
    });
    document.querySelectorAll('.page').forEach(page => {
      page.classList.toggle('active', page.id === pageName);
    });
    
    this.currentPage = pageName;
    window.location.hash = pageName;

    if (pageName === 'categories') {
      this.displayCategories();
    } else if (pageName === 'home') {
      this.filterBooks();
    }
  }

  filterBooks() {
    const category = this.dom.categoryFilter.value;
    const sort = this.dom.sortFilter.value;
    const search = this.dom.searchInput.value.toLowerCase();

    let filteredBooks = [...this.books];

    if (category && category !== 'all') {
      filteredBooks = filteredBooks.filter(book => book.category === category);
    }

    if (search) {
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(search) ||
        book.author.toLowerCase().includes(search) ||
        book.description.toLowerCase().includes(search)
      );
    }

    switch(sort) {
      case 'title':
        filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        filteredBooks.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case 'recent': // 'created_at' est le champ de Supabase
        filteredBooks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'popular': // 'download_count' est notre champ
        filteredBooks.sort((a, b) => b.download_count - a.download_count);
        break;
    }

    this.displayBooks(filteredBooks);
  }

  displayBooks(books) {
    if (books.length === 0) {
      this.dom.booksGrid.innerHTML = '<p class="no-books">Aucun livre trouvé.</p>';
      return;
    }

    this.dom.booksGrid.innerHTML = books.map(book => `
      <div class="book-card" data-id="${book.id}">
        <div class="book-title">${book.title}</div>
        <div class="book-author">${book.author}</div>
        <div class="book-category">${book.category}</div>
        <div class="book-meta">
          <span>${book.file_size_mb} MB</span>
          <span>${book.download_count} téléchargements</span>
        </div>
      </div>
    `).join('');
    
    // Ajouter les listeners après la création des cartes
    document.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => this.showBookDetails(card.dataset.id));
    });
  }

  displayCategories() {
    this.dom.categoriesGrid.innerHTML = this.categories.map(category => `
      <div class="category-card" onclick="app.filterByCategory('${category}')">
        <h3>${category}</h3>
        <p>${this.books.filter(book => book.category === category).length} livres</p>
      </div>
    `).join('');
  }

  filterByCategory(category) {
    this.dom.categoryFilter.value = category;
    this.showPage('home');
    // filterBooks() est déjà appelé par showPage('home')
  }

  async showBookDetails(bookId) {
    const book = this.books.find(b => b.id == bookId);
    if (!book) return;
    
    // Formater la date (publication_date peut être null)
    const pubDate = book.publication_date ? new Date(book.publication_date).toLocaleDateString('fr-FR') : 'Non spécifiée';
    
    this.dom.bookDetails.innerHTML = `
      <h2>${book.title}</h2>
      <div class="book-info">
        <p><strong>Auteur:</strong> ${book.author}</p>
        <p><strong>Catégorie:</strong> ${book.category}</p>
        <p><strong>Date de publication:</strong> ${pubDate}</p>
        <p><strong>Taille:</strong> ${book.file_size_mb} MB</p>
        <p><strong>Téléchargements:</strong> ${book.download_count}</p>
        <p><strong>Description:</strong> ${book.description || 'Aucune description'}</p>
      </div>
      <button class="download-btn" id="modal-download-btn">
        <i class="fas fa-download"></i> Télécharger
      </button>
    `;
    
    // Ajouter le listener au bouton de téléchargement du modal
    document.getElementById('modal-download-btn').addEventListener('click', function(e) {
      // 'this' est le bouton ici
      app.downloadBook(bookId, this); 
    });
    
    this.dom.bookModal.style.display = 'block';
  }

  closeModal() {
    this.dom.bookModal.style.display = 'none';
  }

  // Helper pour les messages
  showMessage(element, message, type = 'success') {
    element.innerHTML = `
      <div class="${type === 'success' ? 'success-message' : 'error-message'}">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
      </div>
    `;
  }
}

// Initialiser l'application
const app = new LibraryApp();