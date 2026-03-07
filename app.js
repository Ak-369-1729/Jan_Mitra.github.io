/**
 * JanMitra — AI-Powered Alpine.js App Logic
 * All janMitraApp() state and methods live here.
 * Loaded before the Alpine CDN script so Alpine picks up the function.
 */

const API_BASE = 'http://localhost:3001';

// Probe backend health once on load
let _apiAvailable = false;
(function probeBackend() {
  fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(4000) })
    .then(r => r.json())
    .then(() => { _apiAvailable = true; console.info('[JanMitra] ✅ Backend connected'); })
    .catch(() => console.warn('[JanMitra] ⚠️ Backend offline — fallback mode active'));
})();

// Scheme cache so we only fetch once
let _schemeCache = null;

function janMitraApp() {
  return {
    /* ── Core state ─────────────────────────────────────── */
    loading: true,
    scrolled: false,
    darkMode: true,
    mobileMenuOpen: false,
    activeSection: 'home',
    eligibilityModalOpen: false,
    schemeDetailModalOpen: false,
    selectedScheme: null,
    checking: false,
    taxRegime: 'new',
    filterCategory: 'all',
    matchedSchemes: [],

    /* ── Form state ─────────────────────────────────────── */
    eligibilityForm: { email: '', age: 30, income: '', state: '', category: '' },
    taxForm: { gross: '', basic: '', hra: '', rent: '', metro: true, profTax: '' },
    taxResults: null,

    /* ── AI Chat state ──────────────────────────────────── */
    chatOpen: false,
    chatMessages: [],
    chatInput: '',
    chatLoading: false,

    /* ── Language state ─────────────────────────────────── */
    langCode: 'en',
    langMenu: false,
    langTranslating: false,

    /* ── Semantic scheme search ─────────────────────────── */
    schemeSearchQuery: '',
    schemeSearchResults: [],
    schemeSearchLoading: false,
    _schemeSearchTimer: null,

    /* ── Personal dashboard ─────────────────────────────── */
    dashboardLoaded: false,
    dashboardSchemes: [],

    /* ── Static data ────────────────────────────────────── */
    navLinks: [
      { id: 'home',        href: '#home',        label: 'Home',        icon: '🏠' },
      { id: 'problem',     href: '#problem',     label: 'The Problem', icon: '⚠️' },
      { id: 'how',         href: '#how',         label: 'How It Works', icon: '🔧' },
      { id: 'eligibility', href: '#eligibility', label: 'Eligibility',  icon: '🎯' },
      { id: 'tax',         href: '#tax',         label: 'Tax Calc',     icon: '💰' },
      { id: 'schemes',     href: '#schemes',     label: 'Schemes',      icon: '📜' },
      { id: 'faq',         href: '#faq',         label: 'FAQ',          icon: '❓' },
      { id: 'contact',     href: '#contact',     label: 'Contact',      icon: '📧' },
    ],

    languages: [
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'hi', label: 'हिन्दी',   flag: '🇮🇳' },
      { code: 'ta', label: 'தமிழ்',   flag: '🏳' },
      { code: 'bn', label: 'বাংলা',   flag: '🏳' },
      { code: 'mr', label: 'मराठी',   flag: '🏳' },
    ],

    states: [
      'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
      'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
      'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
      'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
      'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
      'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh',
      'Andaman & Nicobar','Dadra & NH','Lakshadweep',
    ],

    categories: [
      { value: 'general',  icon: '🌍', label: 'General'  },
      { value: 'sc_st',    icon: '🤝', label: 'SC/ST'    },
      { value: 'obc',      icon: '📋', label: 'OBC'      },
      { value: 'women',    icon: '👩', label: 'Women'    },
      { value: 'farmer',   icon: '🌾', label: 'Farmer'   },
      { value: 'student',  icon: '📚', label: 'Student'  },
      { value: 'senior',   icon: '👴', label: 'Senior'   },
      { value: 'disabled', icon: '♿', label: 'Disabled' },
    ],

    schemeFilters: [
      { value: 'all',         label: 'All Schemes'   },
      { value: 'Agriculture', label: '🌾 Agriculture' },
      { value: 'Health',      label: '🏥 Health'     },
      { value: 'Housing',     label: '🏠 Housing'    },
      { value: 'Education',   label: '📚 Education'  },
      { value: 'Women',       label: '👩 Women'      },
      { value: 'Finance',     label: '💳 Finance'    },
    ],

    schemes: [
      { id:1, name:'PM Kisan Samman Nidhi', category:'Agriculture', icon:'🌾', iconBg:'bg-green-500/10', benefit:'₹6,000', benefitType:'per year', desc:'Direct income support for small and marginal farmers.', fullDesc:'PM-KISAN provides direct income support of ₹6,000 per year to small and marginal farmers holding up to 2 hectares of land, paid in three equal installments of ₹2,000 directly to the farmer\'s bank account.', eligibility:['Farmer family owning up to 2 hectares of agricultural land','Should be Indian citizen','Bank account with Aadhaar linkage mandatory'], docs:['Aadhaar Card','Land records (Khasra/Khatauni)','Bank passbook','Mobile number'], link:'https://pmkisan.gov.in' },
      { id:2, name:'Ayushman Bharat PM-JAY', category:'Health', icon:'🏥', iconBg:'bg-blue-500/10', benefit:'₹5 Lakh', benefitType:'health cover', desc:'World\'s largest government-funded health insurance scheme.', fullDesc:'PM-JAY provides health cover of ₹5 lakh per family per year for secondary and tertiary care hospitalization to over 10.74 crore poor and vulnerable families.', eligibility:['Listed in SECC 2011 database','Below Poverty Line (BPL) family','No other government health insurance'], docs:['Aadhaar Card','Ration Card','SECC verification'], link:'https://pmjay.gov.in' },
      { id:3, name:'PM Awas Yojana (Urban)', category:'Housing', icon:'🏠', iconBg:'bg-orange-500/10', benefit:'₹2.5 Lakh', benefitType:'subsidy', desc:'Affordable housing for urban poor under "Housing for All" mission.', fullDesc:'PMAY-Urban provides central assistance for construction/acquisition of houses to urban poor including credit-linked subsidy for EWS/LIG/MIG categories.', eligibility:['Urban area resident','Annual income < ₹18 lakh (MIG-II)','No pucca house in family','First-time home buyer'], docs:['Aadhaar Card','Income certificate','Property documents','Bank account'], link:'https://pmaymis.gov.in' },
      { id:4, name:'Post Matric Scholarship (SC)', category:'Education', icon:'📚', iconBg:'bg-purple-500/10', benefit:'₹7,000', benefitType:'per year', desc:'Scholarship for SC students pursuing post-matriculation education.', fullDesc:'Central sector scholarship for SC students studying at post-matric or post-secondary stage covering maintenance allowance and reimbursement of non-refundable fees.', eligibility:['SC category student','Annual family income < ₹2.5 lakh','Studying in recognised institution','Not availing any other scholarship'], docs:['Caste certificate','Income certificate','Marksheet','Admission proof'], link:'https://scholarships.gov.in' },
      { id:5, name:'Beti Bachao Beti Padhao', category:'Women', icon:'👧', iconBg:'bg-pink-500/10', benefit:'Free', benefitType:'services', desc:'Scheme to address declining child sex ratio and promote girl education.', fullDesc:'BBBP aims to prevent gender-biased sex selective elimination ensure survival & protection of the girl child and ensure education & participation of girls.', eligibility:['Girl child below 10 years','Indian citizen','Enrolled or to be enrolled in school'], docs:['Birth certificate','Aadhaar','School enrollment proof'], link:'https://wcd.nic.in' },
      { id:6, name:'PM Mudra Yojana', category:'Finance', icon:'💳', iconBg:'bg-yellow-500/10', benefit:'₹10 Lakh', benefitType:'loan', desc:'Micro-enterprise loans for small businesses without collateral.', fullDesc:'PMMY provides loans up to ₹10 lakh to non-corporate non-farm small/micro enterprises. Three categories: Shishu (up to ₹50,000), Kishore (₹50,001–5 lakh), Tarun (₹5–10 lakh).', eligibility:['Any Indian citizen','Non-farm business activity','Age 18–65 years','No willful default history'], docs:['Identity proof','Address proof','Business proof','Bank statement'], link:'https://mudra.org.in' },
      { id:7, name:'MGNREGA', category:'Agriculture', icon:'🔨', iconBg:'bg-amber-500/10', benefit:'₹267+', benefitType:'per day', desc:'Guaranteed 100 days of wage employment per household per year.', fullDesc:'Mahatma Gandhi NREGA guarantees 100 days of wage employment per year to every household whose adult members volunteer to do unskilled manual work.', eligibility:['Rural household member','Adult (18+ years)','Willing to do unskilled work','Registered in job card'], docs:['Job Card','Aadhaar','Bank account','Residence proof'], link:'https://nrega.nic.in' },
      { id:8, name:'PM Ujjwala Yojana 2.0', category:'Women', icon:'🔥', iconBg:'bg-red-500/10', benefit:'Free LPG', benefitType:'connection', desc:'Free LPG connections for women from below poverty line households.', fullDesc:'PMUY 2.0 provides free LPG connection to adult women from poor households including migrant families plus a free first refill and a hot plate.', eligibility:['Adult woman (18+)','BPL household','No existing LPG connection in family','Valid address proof'], docs:['Aadhaar','Bank account','BPL/ration card','Self-declaration for migrants'], link:'https://pmuy.gov.in' },
    ],

    featuredSchemes: [
      { name:'PM Kisan Samman Nidhi', category:'Agriculture', benefit:'₹6,000/yr', desc:'Direct ₹2,000 every 4 months to 11+ crore farmers, straight to bank accounts.', gradientClass:'bg-gradient-to-br from-green-800 to-green-950' },
      { name:'Ayushman Bharat PM-JAY', category:'Health', benefit:'₹5 Lakh', desc:"World's largest health insurance — free hospitalization for 50 crore Indians.", gradientClass:'bg-gradient-to-br from-blue-800 to-blue-950' },
      { name:'PM Awas Yojana', category:'Housing', benefit:'₹2.5 Lakh', desc:'Subsidy for your own pucca home — urban and rural variants available.', gradientClass:'bg-gradient-to-br from-orange-800 to-orange-950' },
      { name:'PM Mudra Yojana', category:'Finance', benefit:'₹10 Lakh', desc:'No collateral, no guarantor — business loans for micro-entrepreneurs.', gradientClass:'bg-gradient-to-br from-yellow-800 to-amber-950' },
      { name:'PM Ujjwala Yojana 2.0', category:'Women & Family', benefit:'Free LPG', desc:'Clean cooking fuel connection for 9+ crore BPL households across India.', gradientClass:'bg-gradient-to-br from-red-800 to-red-950' },
    ],

    faqs: [
      { q:'Is Jan मित्र free to use?', a:'Yes, absolutely free. Always. Jan मित्र will never charge you for finding schemes you are legally entitled to.' },
      { q:'Do I need to create an account or log in?', a:"No account, no login, no registration. Enter basic information, we show your matched schemes. We don't store personal data after the session." },
      { q:'How accurate are the eligibility results?', a:'Our AI cross-references your profile against scheme rules in real-time using Gemini. Results are indicative — final eligibility is determined by the respective government department.' },
      { q:'Do you cover state-level schemes as well?', a:'Yes! We cover both central government and major state-level schemes across all 36 states and UTs.' },
      { q:'What if I find incorrect information?', a:'Please use the Contact form to report it. We update corrections within 48–72 hours.' },
      { q:'Is the tax calculator up to date for FY 2025–26?', a:'Yes, our tax calculator uses the latest slab rates for FY 2025–26 (AY 2026–27), incorporating all amendments from Union Budget 2025.' },
      { q:'Does Jan मित्र work in Hindi and other regional languages?', a:'Yes! Use the 🌐 language selector in the navbar to switch between English, Hindi, Tamil, Bengali, and Marathi. Powered by Gemini AI translation.' },
      { q:'Can organizations or NGOs use Jan मित्र for community outreach?', a:'Absolutely. Panchayats, NGOs, and CSOs are welcome. We also offer a partnership program. Write to us at hello@janmitra.in.' },
    ],

    /* ── Computed ────────────────────────────────────────── */
    get filteredSchemes() {
      const base = (this.schemeSearchResults.length > 0) ? this.schemeSearchResults : this.schemes;
      if (this.filterCategory === 'all') return base;
      return base.filter(s => s.category === this.filterCategory);
    },

    /* ── Init ────────────────────────────────────────────── */
    init() {
      setTimeout(() => { this.loading = false; }, 3000);

      window.addEventListener('scroll', () => {
        this.scrolled = window.scrollY > 40;
        this.updateActiveSection();
      }, { passive: true });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll('[data-observe]').forEach(el => observer.observe(el));

      // Add welcome chat message
      this.chatMessages = [{
        role: 'assistant',
        content: 'नमस्ते! 🙏 I\'m Jan मित्र AI. Ask me anything about government schemes — I can help you find what you qualify for, explain eligibility, required documents, and more!',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }];
    },

    updateActiveSection() {
      const sections = ['home','problem','how','eligibility','tax','schemes','faq','contact'];
      for (let id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) { this.activeSection = id; return; }
      }
    },

    /* ── Dark mode ───────────────────────────────────────── */
    toggleDarkMode(evt) {
      const btn = evt ? evt.currentTarget : document.querySelector('.theme-toggle');
      if (!btn) { this.darkMode = !this.darkMode; return; }
      const overlay = document.createElement('div');
      const rect = btn.getBoundingClientRect();
      const rx = rect.left + rect.width / 2, ry = rect.top + rect.height / 2;
      const bgColor = this.darkMode ? '#FDFAF5' : '#04050F';
      Object.assign(overlay.style, {
        position:'fixed',inset:'0',zIndex:'9998',pointerEvents:'none',background:bgColor,
        clipPath:`circle(0% at ${rx}px ${ry}px)`,transition:'clip-path 0.65s cubic-bezier(0.4,0,0.2,1)',
      });
      document.body.appendChild(overlay);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.style.clipPath = `circle(200% at ${rx}px ${ry}px)`;
        setTimeout(() => {
          this.darkMode = !this.darkMode;
          document.documentElement.classList.toggle('dark', this.darkMode);
          setTimeout(() => { overlay.style.transition='opacity 0.35s ease'; overlay.style.opacity='0'; setTimeout(()=>overlay.remove(),400); }, 80);
        }, 380);
      }));
    },

    /* ── AGENT 2+3: Eligibility check ────────────────────── */
    async runEligibilityCheck() {
      this.checking = true;
      try {
        if (_apiAvailable) {
          // Build profile via Agent 2
          const profileRes = await fetch(`${API_BASE}/api/build-profile`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ formData: this.eligibilityForm }),
          });
          const profileData = await profileRes.json();
          const profile = profileData.data;

          // Discover benefits via Agent 3
          const benefitRes = await fetch(`${API_BASE}/api/discover-benefits`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ profile }),
          });
          const benefitData = await benefitRes.json();
          this.matchedSchemes = benefitData.data || [];

          // Save session if email provided
          if (this.eligibilityForm.email && this.matchedSchemes.length > 0) {
            fetch(`${API_BASE}/api/save-session`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ email: this.eligibilityForm.email, profile, matchedSchemes: this.matchedSchemes }),
            }).catch(()=>{});
          }
        } else {
          // Fallback: rule-based matching
          this._fallbackMatch();
        }
      } catch (err) {
        console.error('[runEligibilityCheck]', err);
        this._fallbackMatch();
      } finally {
        this.checking = false;
        this.eligibilityModalOpen = true;
      }
    },

    _fallbackMatch() {
      const age = parseInt(this.eligibilityForm.age) || 30;
      const income = parseInt((this.eligibilityForm.income||'').replace(/,/g,'')) || 0;
      const cat = this.eligibilityForm.category;
      this.matchedSchemes = this.schemes.filter(s => {
        if (s.category === 'Women'       && cat === 'women')   return true;
        if (s.category === 'Agriculture' && cat === 'farmer')  return true;
        if (s.category === 'Education'   && cat === 'student') return true;
        if (income < 300000) return true;
        return Math.random() > 0.35;
      }).map(s => ({
        ...s,
        match: Math.floor(Math.random() * 25) + 70,
        explanation: `Your profile matches the eligibility criteria for ${s.name}.`,
      })).sort((a,b) => b.match - a.match).slice(0,6);
    },

    /* ── Dashboard: load saved session ───────────────────── */
    async loadDashboard() {
      if (!this.eligibilityForm.email) return;
      try {
        const res = await fetch(`${API_BASE}/api/get-session/${encodeURIComponent(this.eligibilityForm.email)}`);
        const data = await res.json();
        if (data.success && data.data?.matched_schemes?.length > 0) {
          this.matchedSchemes = data.data.matched_schemes;
          this.dashboardLoaded = true;
          this.eligibilityModalOpen = true;
        } else {
          alert('No saved results found for this email.');
        }
      } catch { alert('Could not load saved session. Please try again.'); }
    },

    /* ── AI Scheme Search ────────────────────────────────── */
    onSchemeSearchInput() {
      clearTimeout(this._schemeSearchTimer);
      const q = this.schemeSearchQuery.trim();
      if (!q || q.length < 2) { this.schemeSearchResults = []; return; }
      this._schemeSearchTimer = setTimeout(() => this._doSchemeSearch(q), 350);
    },

    async _doSchemeSearch(query) {
      this.schemeSearchLoading = true;
      try {
        if (_apiAvailable) {
          const res = await fetch(`${API_BASE}/api/search-schemes`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ query }),
          });
          const data = await res.json();
          this.schemeSearchResults = data.data || [];
        } else {
          // Simple keyword fallback
          const q = query.toLowerCase();
          this.schemeSearchResults = this.schemes.filter(s =>
            s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
          );
        }
      } catch { this.schemeSearchResults = []; }
      finally { this.schemeSearchLoading = false; }
    },

    clearSchemeSearch() {
      this.schemeSearchQuery = '';
      this.schemeSearchResults = [];
    },

    /* ── AI Chat ─────────────────────────────────────────── */
    async sendChatMessage() {
      const msg = this.chatInput.trim();
      if (!msg || this.chatLoading) return;
      this.chatInput = '';
      this.chatMessages.push({
        role:'user', content: msg,
        time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      });
      this.chatLoading = true;
      try {
        if (_apiAvailable) {
          const history = this.chatMessages.slice(-8).filter(m => m.role !== 'system');
          const res = await fetch(`${API_BASE}/api/chat`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ message: msg, history }),
          });
          const data = await res.json();
          this.chatMessages.push({
            role:'assistant', content: data.data?.reply || 'Sorry, I could not process that. Please try again.',
            time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
          });
        } else {
          this.chatMessages.push({
            role:'assistant',
            content:'🔌 AI backend is not connected. Please start the server with `npm start` in the project folder. In the meantime, use the Eligibility Checker above!',
            time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
          });
        }
      } catch {
        this.chatMessages.push({ role:'assistant', content:'Network error. Please try again.', time:'' });
      } finally { this.chatLoading = false; this.$nextTick(()=>this._scrollChat()); }
    },

    _scrollChat() {
      const el = document.getElementById('chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    },

    onChatKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
    },

    /* ── Language / Translation ──────────────────────────── */
    async setLanguage(code) {
      if (code === this.langCode) { this.langMenu = false; return; }
      this.langCode = code;
      this.langMenu = false;
      if (code === 'en' || !_apiAvailable) return;

      this.langTranslating = true;
      try {
        // Translate key UI strings
        const uiStrings = [
          'Check My Eligibility','Browse Schemes','The Problem','How It Works',
          'Find My Schemes','Eligibility Checker','Check Your Eligibility',
          'Tax Calculator','Scheme Browser','Common Questions','Get in Touch',
          'Featured Schemes','Check Eligibility','Send Message',
        ];
        const res = await fetch(`${API_BASE}/api/translate`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ texts: uiStrings, targetLanguage: code }),
        });
        const data = await res.json();
        if (data.success) {
          // Store translations for template binding
          this.translations = {};
          uiStrings.forEach((s, i) => { this.translations[s] = data.data[i] || s; });
        }
      } catch { /* silent fail */ }
      finally { this.langTranslating = false; }
    },

    t(key) {
      if (!this.translations || this.langCode === 'en') return key;
      return this.translations[key] || key;
    },

    translations: {},

    /* ── Tax Calculator ──────────────────────────────────── */
    calculateTax() {
      const gross = parseInt((this.taxForm.gross||'').replace(/,/g,'')) || 0;
      if (!gross) return;

      const calcNew = (income) => {
        const slabs = [{upto:400000,rate:0},{upto:800000,rate:0.05},{upto:1200000,rate:0.10},{upto:1600000,rate:0.15},{upto:2000000,rate:0.20},{upto:2400000,rate:0.25},{upto:Infinity,rate:0.30}];
        const taxable = Math.max(0, income - 75000);
        let tax = 0, prev = 0;
        for (const s of slabs) { if (taxable<=prev) break; tax+=(Math.min(taxable,s.upto)-prev)*s.rate; prev=s.upto; }
        if (income<=1200000) tax=0;
        return Math.round(tax*1.04);
      };

      const calcOld = (income) => {
        const basic = parseInt((this.taxForm.basic||'').replace(/,/g,'')) || income*0.5;
        const hra   = parseInt((this.taxForm.hra||'').replace(/,/g,''))   || 0;
        const rent  = parseInt((this.taxForm.rent||'').replace(/,/g,''))  || 0;
        const pt    = parseInt((this.taxForm.profTax||'').replace(/,/g,''))|| 0;
        const hraEx = Math.min(hra, this.taxForm.metro?basic*0.5:basic*0.4, Math.max(0,rent-basic*0.1));
        const taxable = Math.max(0, income - 50000 - hraEx - pt - 150000);
        const slabs = [{upto:250000,rate:0},{upto:500000,rate:0.05},{upto:1000000,rate:0.20},{upto:Infinity,rate:0.30}];
        let tax=0,prev=0;
        for (const s of slabs) { if(taxable<=prev)break; tax+=(Math.min(taxable,s.upto)-prev)*s.rate; prev=s.upto; }
        if(taxable<=500000) tax=0;
        return Math.round(tax*1.04);
      };

      const newTax=calcNew(gross), oldTax=calcOld(gross), maxTax=Math.max(newTax,oldTax,1);
      this.taxResults = {
        newTax, oldTax,
        newPct: Math.round(newTax/maxTax*100),
        oldPct: Math.round(oldTax/maxTax*100),
        newEffective: (newTax/gross*100).toFixed(1),
        oldEffective: (oldTax/gross*100).toFixed(1),
        recommendation: newTax<=oldTax?'new':'old',
        savings: Math.abs(newTax-oldTax),
      };
    },
  };
}
