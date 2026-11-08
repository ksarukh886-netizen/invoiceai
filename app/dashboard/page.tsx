
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useLocale } from "../../components/LocaleProvider";

type Item = {
  description: string;
  qty: number;
  price: number;
};

type Doc = {
  id: string;
  number: string;
  type: string;
  customer: string;
  email: string;
  items: Item[];
  tax: number;
  discount: number;
  status: string;
  notes: string;
  total: number;
  currency?: string;
  created_at: string;
};

type View =
  | "Dashboard"
  | "Create invoice"
  | "Invoices"
  | "Customers"
  | "Pricing";

const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    create: "Create invoice",
    invoices: "Invoices",
    customers: "Customers",
    pricing: "Pricing",
    logout: "Log out",
    workspace: "Workspace",
    free: "FREE PLAN",
    pro: "PRO PLAN",
    checking: "Checking plan...",
    active: "Pro subscription active",
    viewPlans: "View plans",
    welcome: "Smart invoice builder",
    welcomeText: "Create, save and follow up with customers.",
    quick: "Quick overview",
    totalDocs: "Total documents",
    pendingPayments: "Pending payments",
    currentPlan: "Current plan",
    viewInvoices: "View invoices",
    enterDetails: "Enter details; preview updates automatically.",
    save: "Save",
    saving: "Saving...",
    type: "Type",
    customer: "Customer",
    email: "Email",
    items: "Items",
    description: "Description",
    quantity: "Quantity",
    price: "Price",
    addItem: "Add item",
    tax: "Tax %",
    discount: "Discount",
    notes: "Notes",
    generate: "Generate AI reminder",
    generating: "Generating...",
    copy: "Copy reminder",
    whatsapp: "Send with WhatsApp",
    pdf: "Print / Save PDF",
    billTo: "BILL TO",
    subtotal: "Subtotal",
    total: "Total",
    invoiceQuotes: "Invoices & quotes",
    manage: "Manage saved documents and payment status.",
    createNew: "Create new",
    noDocs: "No saved documents yet. Create your first invoice.",
    number: "Number",
    status: "Status",
    actions: "Actions",
    editCopy: "Edit copy",
    delete: "Delete",
    plans: "Plans & Pricing",
    choosePlan: "Choose the plan that fits your business.",
    start: "START HERE",
    forSmall: "For small businesses getting started.",
    ten: "10 invoices per month",
    pdfFeature: "PDF / print download",
    customerFeature: "Customer list from saved invoices",
    reminderFeature: "Manual WhatsApp reminders",
    statusFeature: "Pending and Paid status",
    current: "Current plan",
    growing: "FOR GROWING BUSINESSES",
    forBusiness: "More room for your business.",
    unlimited: "Unlimited invoices in this app",
    allFree: "All Free features",
    branding: "Business branding options",
    updates: "Priority feature updates",
    proActive: "Pro Active",
    upgrade: "Upgrade to Pro",
    secure: "Secure checkout powered by Razorpay. Payment status is verified by the server.",
    customerText: "Customers are collected from your saved invoices and quotes.",
    addCustomer: "Add customer via invoice",
    noCustomers: "No customers yet. Save an invoice with a customer name to see them here.",
    name: "Name",
    documents: "Documents",
    action: "Action",
    recent: "Recent documents",
    noRecent: "No documents yet.",
    item: "Item",
    discountLabel: "Discount",
    bill: "Bill To",
    yourBusiness: "Your Business",
    thankYou: "Thank you for your business!",
    popBlocked: "Pop-up blocked. Allow pop-ups in your browser.",
    copyDone: "Reminder copied.",
    pdfMessage: "PDF window opened. Save as PDF, then attach it in WhatsApp.",
    limit: "Free plan limit of 10 invoices/month reached.",
    customerRequired: "Please enter the customer name first.",
    descriptionRequired: "Please enter a description for every item.",
    login: "Login session not found. Please log in again.",
    saved: "Saved successfully!",
    no: "No",
    editDetails: "Details loaded. Saving will create a new document.",
    planLoad: "Subscription status is loading. Please wait.",
    month: "month",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    create: "इनवॉइस बनाएं",
    invoices: "इनवॉइस",
    customers: "ग्राहक",
    pricing: "प्लान और कीमत",
    logout: "लॉग आउट",
    workspace: "वर्कस्पेस",
    free: "फ्री प्लान",
    pro: "प्रो प्लान",
    checking: "प्लान चेक हो रहा है...",
    active: "प्रो सब्सक्रिप्शन चालू है",
    viewPlans: "प्लान देखें",
    welcome: "स्मार्ट इनवॉइस बिल्डर",
    welcomeText: "इनवॉइस बनाएं, सेव करें और ग्राहकों से संपर्क करें।",
    quick: "त्वरित जानकारी",
    totalDocs: "कुल दस्तावेज",
    pendingPayments: "बाकी भुगतान",
    currentPlan: "मौजूदा प्लान",
    viewInvoices: "इनवॉइस देखें",
    enterDetails: "जानकारी भरें; प्रीव्यू अपने आप अपडेट होगा।",
    save: "सेव करें",
    saving: "सेव हो रहा है...",
    type: "प्रकार",
    customer: "ग्राहक",
    email: "ईमेल",
    items: "आइटम",
    description: "विवरण",
    quantity: "मात्रा",
    price: "कीमत",
    addItem: "आइटम जोड़ें",
    tax: "टैक्स %",
    discount: "छूट",
    notes: "नोट्स",
    generate: "AI रिमाइंडर बनाएं",
    generating: "बन रहा है...",
    copy: "रिमाइंडर कॉपी करें",
    whatsapp: "WhatsApp से भेजें",
    pdf: "प्रिंट / PDF सेव करें",
    billTo: "बिल प्राप्तकर्ता",
    subtotal: "उप-कुल",
    total: "कुल",
    invoiceQuotes: "इनवॉइस और कोटेशन",
    manage: "सेव किए गए दस्तावेज और भुगतान मैनेज करें।",
    createNew: "नया बनाएं",
    noDocs: "अभी कोई दस्तावेज नहीं है। पहला इनवॉइस बनाएं।",
    number: "नंबर",
    status: "स्थिति",
    actions: "कार्य",
    editCopy: "कॉपी एडिट करें",
    delete: "डिलीट",
    plans: "प्लान और कीमत",
    choosePlan: "अपने बिजनेस के लिए सही प्लान चुनें।",
    start: "यहाँ से शुरू करें",
    forSmall: "छोटे बिजनेस के लिए।",
    ten: "हर महीने 10 इनवॉइस",
    pdfFeature: "PDF / प्रिंट डाउनलोड",
    customerFeature: "सेव किए गए ग्राहकों की सूची",
    reminderFeature: "WhatsApp रिमाइंडर",
    statusFeature: "Pending और Paid स्थिति",
    current: "मौजूदा प्लान",
    growing: "बढ़ते बिजनेस के लिए",
    forBusiness: "आपके बिजनेस के लिए ज्यादा सुविधाएं।",
    unlimited: "अनलिमिटेड इनवॉइस",
    allFree: "फ्री प्लान की सभी सुविधाएं",
    branding: "बिजनेस ब्रांडिंग विकल्प",
    updates: "प्राथमिकता वाले अपडेट",
    proActive: "प्रो चालू है",
    upgrade: "प्रो में अपग्रेड करें",
    secure: "Razorpay सुरक्षित भुगतान। भुगतान की पुष्टि सर्वर करता है।",
    customerText: "ग्राहक आपके सेव किए गए इनवॉइस से आते हैं।",
    addCustomer: "इनवॉइस से ग्राहक जोड़ें",
    noCustomers: "अभी कोई ग्राहक नहीं है।",
    name: "नाम",
    documents: "दस्तावेज",
    action: "कार्य",
    recent: "हाल के दस्तावेज",
    noRecent: "अभी कोई दस्तावेज नहीं है।",
    item: "आइटम",
    discountLabel: "छूट",
    bill: "बिल प्राप्तकर्ता",
    yourBusiness: "आपका बिजनेस",
    thankYou: "आपके बिजनेस के लिए धन्यवाद!",
    popBlocked: "पॉप-अप ब्लॉक है। ब्राउज़र में पॉप-अप चालू करें।",
    copyDone: "रिमाइंडर कॉपी हो गया।",
    pdfMessage: "PDF विंडो खुल गई। PDF सेव करें और WhatsApp में जोड़ें।",
    limit: "फ्री प्लान की 10 इनवॉइस प्रति माह की सीमा पूरी हो गई।",
    customerRequired: "पहले ग्राहक का नाम भरें।",
    descriptionRequired: "हर आइटम का विवरण भरें।",
    login: "लॉगिन सेशन नहीं मिला। दोबारा लॉगिन करें।",
    saved: "सफलतापूर्वक सेव हो गया!",
    no: "नहीं",
    editDetails: "जानकारी लोड हो गई। सेव करने पर नया दस्तावेज बनेगा।",
    planLoad: "सब्सक्रिप्शन लोड हो रहा है। प्रतीक्षा करें।",
    month: "महीना",
  },
  es: {
    dashboard: "Panel",
    create: "Crear factura",
    invoices: "Facturas",
    customers: "Clientes",
    pricing: "Precios",
    logout: "Cerrar sesión",
    workspace: "Espacio de trabajo",
    free: "PLAN GRATIS",
    pro: "PLAN PRO",
    checking: "Comprobando plan...",
    active: "Suscripción Pro activa",
    viewPlans: "Ver planes",
    welcome: "Creador inteligente de facturas",
    welcomeText: "Crea, guarda y contacta con tus clientes.",
    quick: "Resumen rápido",
    totalDocs: "Documentos totales",
    pendingPayments: "Pagos pendientes",
    currentPlan: "Plan actual",
    viewInvoices: "Ver facturas",
    enterDetails: "Introduce los datos; la vista previa se actualiza automáticamente.",
    save: "Guardar",
    saving: "Guardando...",
    type: "Tipo",
    customer: "Cliente",
    email: "Correo electrónico",
    items: "Artículos",
    description: "Descripción",
    quantity: "Cantidad",
    price: "Precio",
    addItem: "Añadir artículo",
    tax: "Impuesto %",
    discount: "Descuento",
    notes: "Notas",
    generate: "Generar recordatorio con IA",
    generating: "Generando...",
    copy: "Copiar recordatorio",
    whatsapp: "Enviar por WhatsApp",
    pdf: "Imprimir / Guardar PDF",
    billTo: "FACTURAR A",
    subtotal: "Subtotal",
    total: "Total",
    invoiceQuotes: "Facturas y presupuestos",
    manage: "Gestiona documentos y estados de pago.",
    createNew: "Crear nuevo",
    noDocs: "Todavía no hay documentos. Crea tu primera factura.",
    number: "Número",
    status: "Estado",
    actions: "Acciones",
    editCopy: "Editar copia",
    delete: "Eliminar",
    plans: "Planes y precios",
    choosePlan: "Elige el plan adecuado para tu negocio.",
    start: "EMPIEZA AQUÍ",
    forSmall: "Para pequeñas empresas.",
    ten: "10 facturas al mes",
    pdfFeature: "Descarga PDF / impresión",
    customerFeature: "Lista de clientes guardados",
    reminderFeature: "Recordatorios por WhatsApp",
    statusFeature: "Estados pendiente y pagado",
    current: "Plan actual",
    growing: "PARA EMPRESAS EN CRECIMIENTO",
    forBusiness: "Más espacio para tu negocio.",
    unlimited: "Facturas ilimitadas",
    allFree: "Todas las funciones gratuitas",
    branding: "Opciones de marca empresarial",
    updates: "Actualizaciones prioritarias",
    proActive: "Pro activo",
    upgrade: "Actualizar a Pro",
    secure: "Pago seguro con Razorpay. El servidor verifica el pago.",
    customerText: "Los clientes se recopilan de tus facturas guardadas.",
    addCustomer: "Añadir cliente mediante factura",
    noCustomers: "Todavía no hay clientes.",
    name: "Nombre",
    documents: "Documentos",
    action: "Acción",
    recent: "Documentos recientes",
    noRecent: "Todavía no hay documentos.",
    item: "Artículo",
    discountLabel: "Descuento",
    bill: "Facturar a",
    yourBusiness: "Tu negocio",
    thankYou: "¡Gracias por tu negocio!",
    popBlocked: "Ventana emergente bloqueada. Permite las ventanas emergentes.",
    copyDone: "Recordatorio copiado.",
    pdfMessage: "Ventana PDF abierta. Guarda el PDF y adjúntalo en WhatsApp.",
    limit: "Has alcanzado el límite de 10 facturas mensuales del plan gratuito.",
    customerRequired: "Introduce primero el nombre del cliente.",
    descriptionRequired: "Introduce una descripción para cada artículo.",
    login: "No se encontró la sesión. Inicia sesión de nuevo.",
    saved: "¡Guardado correctamente!",
    no: "No",
    editDetails: "Datos cargados. Guardar creará un documento nuevo.",
    planLoad: "Cargando suscripción. Espera.",
    month: "mes",
  },
  fr: {
    dashboard: "Tableau de bord",
    create: "Créer une facture",
    invoices: "Factures",
    customers: "Clients",
    pricing: "Tarifs",
    logout: "Déconnexion",
    workspace: "Espace de travail",
    free: "OFFRE GRATUITE",
    pro: "OFFRE PRO",
    checking: "Vérification de l'offre...",
    active: "Abonnement Pro actif",
    viewPlans: "Voir les offres",
    welcome: "Créateur de factures intelligent",
    welcomeText: "Créez, enregistrez et contactez vos clients.",
    quick: "Aperçu rapide",
    totalDocs: "Total des documents",
    pendingPayments: "Paiements en attente",
    currentPlan: "Offre actuelle",
    viewInvoices: "Voir les factures",
    enterDetails: "Saisissez les détails ; l'aperçu se met à jour automatiquement.",
    save: "Enregistrer",
    saving: "Enregistrement...",
    type: "Type",
    customer: "Client",
    email: "E-mail",
    items: "Articles",
    description: "Description",
    quantity: "Quantité",
    price: "Prix",
    addItem: "Ajouter un article",
    tax: "Taxe %",
    discount: "Remise",
    notes: "Notes",
    generate: "Générer un rappel IA",
    generating: "Génération...",
    copy: "Copier le rappel",
    whatsapp: "Envoyer avec WhatsApp",
    pdf: "Imprimer / Enregistrer PDF",
    billTo: "FACTURER À",
    subtotal: "Sous-total",
    total: "Total",
    invoiceQuotes: "Factures et devis",
    manage: "Gérez les documents et les paiements.",
    createNew: "Créer",
    noDocs: "Aucun document. Créez votre première facture.",
    number: "Numéro",
    status: "Statut",
    actions: "Actions",
    editCopy: "Modifier la copie",
    delete: "Supprimer",
    plans: "Offres et tarifs",
    choosePlan: "Choisissez l'offre adaptée à votre entreprise.",
    start: "COMMENCEZ ICI",
    forSmall: "Pour les petites entreprises.",
    ten: "10 factures par mois",
    pdfFeature: "Téléchargement PDF / impression",
    customerFeature: "Liste des clients enregistrés",
    reminderFeature: "Rappels WhatsApp",
    statusFeature: "Statuts payé et en attente",
    current: "Offre actuelle",
    growing: "POUR LES ENTREPRISES EN CROISSANCE",
    forBusiness: "Plus de possibilités pour votre entreprise.",
    unlimited: "Factures illimitées",
    allFree: "Toutes les fonctions gratuites",
    branding: "Options de marque",
    updates: "Mises à jour prioritaires",
    proActive: "Pro actif",
    upgrade: "Passer à Pro",
    secure: "Paiement sécurisé par Razorpay. Vérification par le serveur.",
    customerText: "Les clients proviennent de vos factures enregistrées.",
    addCustomer: "Ajouter un client via une facture",
    noCustomers: "Aucun client pour le moment.",
    name: "Nom",
    documents: "Documents",
    action: "Action",
    recent: "Documents récents",
    noRecent: "Aucun document pour le moment.",
    item: "Article",
    discountLabel: "Remise",
    bill: "Facturer à",
    yourBusiness: "Votre entreprise",
    thankYou: "Merci pour votre confiance !",
    popBlocked: "Fenêtre bloquée. Autorisez les fenêtres contextuelles.",
    copyDone: "Rappel copié.",
    pdfMessage: "Fenêtre PDF ouverte. Enregistrez le PDF puis joignez-le à WhatsApp.",
    limit: "Limite de 10 factures par mois atteinte.",
    customerRequired: "Saisissez d'abord le nom du client.",
    descriptionRequired: "Ajoutez une description pour chaque article.",
    login: "Session introuvable. Veuillez vous reconnecter.",
    saved: "Enregistré avec succès !",
    no: "Non",
    editDetails: "Détails chargés. L'enregistrement créera un nouveau document.",
    planLoad: "Chargement de l'abonnement. Veuillez patienter.",
    month: "mois",
  },
  de: {
    dashboard: "Dashboard",
    create: "Rechnung erstellen",
    invoices: "Rechnungen",
    customers: "Kunden",
    pricing: "Preise",
    logout: "Abmelden",
    workspace: "Arbeitsbereich",
    free: "KOSTENLOSER PLAN",
    pro: "PRO-PLAN",
    checking: "Plan wird geprüft...",
    active: "Pro-Abonnement aktiv",
    viewPlans: "Pläne ansehen",
    welcome: "Intelligenter Rechnungseditor",
    welcomeText: "Erstellen, speichern und kontaktieren Sie Kunden.",
    quick: "Schnellübersicht",
    totalDocs: "Dokumente insgesamt",
    pendingPayments: "Offene Zahlungen",
    currentPlan: "Aktueller Plan",
    viewInvoices: "Rechnungen ansehen",
    enterDetails: "Details eingeben; die Vorschau wird automatisch aktualisiert.",
    save: "Speichern",
    saving: "Speichern...",
    type: "Typ",
    customer: "Kunde",
    email: "E-Mail",
    items: "Positionen",
    description: "Beschreibung",
    quantity: "Menge",
    price: "Preis",
    addItem: "Position hinzufügen",
    tax: "Steuer %",
    discount: "Rabatt",
    notes: "Notizen",
    generate: "KI-Erinnerung erstellen",
    generating: "Wird erstellt...",
    copy: "Erinnerung kopieren",
    whatsapp: "Mit WhatsApp senden",
    pdf: "Drucken / PDF speichern",
    billTo: "RECHNUNG AN",
    subtotal: "Zwischensumme",
    total: "Gesamt",
    invoiceQuotes: "Rechnungen und Angebote",
    manage: "Gespeicherte Dokumente und Zahlungsstatus verwalten.",
    createNew: "Neu erstellen",
    noDocs: "Noch keine Dokumente. Erstellen Sie Ihre erste Rechnung.",
    number: "Nummer",
    status: "Status",
    actions: "Aktionen",
    editCopy: "Kopie bearbeiten",
    delete: "Löschen",
    plans: "Pläne und Preise",
    choosePlan: "Wählen Sie den passenden Plan für Ihr Unternehmen.",
    start: "HIER STARTEN",
    forSmall: "Für kleine Unternehmen.",
    ten: "10 Rechnungen pro Monat",
    pdfFeature: "PDF-Download / Drucken",
    customerFeature: "Gespeicherte Kundenliste",
    reminderFeature: "WhatsApp-Erinnerungen",
    statusFeature: "Offen- und Bezahlt-Status",
    current: "Aktueller Plan",
    growing: "FÜR WACHSENDE UNTERNEHMEN",
    forBusiness: "Mehr Möglichkeiten für Ihr Unternehmen.",
    unlimited: "Unbegrenzte Rechnungen",
    allFree: "Alle kostenlosen Funktionen",
    branding: "Unternehmensbranding",
    updates: "Priorisierte Updates",
    proActive: "Pro aktiv",
    upgrade: "Auf Pro upgraden",
    secure: "Sichere Zahlung mit Razorpay. Der Server prüft den Zahlungsstatus.",
    customerText: "Kunden werden aus gespeicherten Rechnungen übernommen.",
    addCustomer: "Kunde über Rechnung hinzufügen",
    noCustomers: "Noch keine Kunden vorhanden.",
    name: "Name",
    documents: "Dokumente",
    action: "Aktion",
    recent: "Letzte Dokumente",
    noRecent: "Noch keine Dokumente vorhanden.",
    item: "Position",
    discountLabel: "Rabatt",
    bill: "Rechnung an",
    yourBusiness: "Ihr Unternehmen",
    thankYou: "Vielen Dank für Ihren Auftrag!",
    popBlocked: "Pop-up blockiert. Bitte Pop-ups erlauben.",
    copyDone: "Erinnerung kopiert.",
    pdfMessage: "PDF-Fenster geöffnet. Speichern Sie das PDF und hängen Sie es in WhatsApp an.",
    limit: "Das Limit von 10 Rechnungen pro Monat ist erreicht.",
    customerRequired: "Bitte zuerst den Kundennamen eingeben.",
    descriptionRequired: "Bitte für jede Position eine Beschreibung eingeben.",
    login: "Keine Sitzung gefunden. Bitte erneut anmelden.",
    saved: "Erfolgreich gespeichert!",
    no: "Nein",
    editDetails: "Details geladen. Speichern erstellt ein neues Dokument.",
    planLoad: "Abonnement wird geladen. Bitte warten.",
    month: "Monat",
  },
  ar: {
    dashboard: "لوحة التحكم",
    create: "إنشاء فاتورة",
    invoices: "الفواتير",
    customers: "العملاء",
    pricing: "الأسعار",
    logout: "تسجيل الخروج",
    workspace: "مساحة العمل",
    free: "الخطة المجانية",
    pro: "خطة برو",
    checking: "جارٍ التحقق من الخطة...",
    active: "اشتراك برو نشط",
    viewPlans: "عرض الخطط",
    welcome: "منشئ الفواتير الذكي",
    welcomeText: "أنشئ الفواتير واحفظها وتابع مع العملاء.",
    quick: "نظرة سريعة",
    totalDocs: "إجمالي المستندات",
    pendingPayments: "المدفوعات المعلقة",
    currentPlan: "الخطة الحالية",
    viewInvoices: "عرض الفواتير",
    enterDetails: "أدخل التفاصيل؛ سيتم تحديث المعاينة تلقائياً.",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    type: "النوع",
    customer: "العميل",
    email: "البريد الإلكتروني",
    items: "العناصر",
    description: "الوصف",
    quantity: "الكمية",
    price: "السعر",
    addItem: "إضافة عنصر",
    tax: "الضريبة %",
    discount: "الخصم",
    notes: "ملاحظات",
    generate: "إنشاء تذكير بالذكاء الاصطناعي",
    generating: "جارٍ الإنشاء...",
    copy: "نسخ التذكير",
    whatsapp: "إرسال عبر واتساب",
    pdf: "طباعة / حفظ PDF",
    billTo: "فاتورة إلى",
    subtotal: "المجموع الفرعي",
    total: "الإجمالي",
    invoiceQuotes: "الفواتير وعروض الأسعار",
    manage: "إدارة المستندات وحالة الدفع.",
    createNew: "إنشاء جديد",
    noDocs: "لا توجد مستندات بعد. أنشئ فاتورتك الأولى.",
    number: "الرقم",
    status: "الحالة",
    actions: "الإجراءات",
    editCopy: "تعديل نسخة",
    delete: "حذف",
    plans: "الخطط والأسعار",
    choosePlan: "اختر الخطة المناسبة لنشاطك التجاري.",
    start: "ابدأ هنا",
    forSmall: "للشركات الصغيرة.",
    ten: "10 فواتير شهرياً",
    pdfFeature: "تنزيل PDF / طباعة",
    customerFeature: "قائمة العملاء المحفوظة",
    reminderFeature: "تذكيرات واتساب",
    statusFeature: "حالة مدفوع وغير مدفوع",
    current: "الخطة الحالية",
    growing: "للشركات النامية",
    forBusiness: "مزايا أكثر لنشاطك التجاري.",
    unlimited: "فواتير غير محدودة",
    allFree: "جميع ميزات الخطة المجانية",
    branding: "خيارات العلامة التجارية",
    updates: "تحديثات ذات أولوية",
    proActive: "برو نشط",
    upgrade: "الترقية إلى برو",
    secure: "دفع آمن عبر Razorpay. يتحقق الخادم من حالة الدفع.",
    customerText: "يتم جمع العملاء من الفواتير المحفوظة.",
    addCustomer: "إضافة عميل عبر فاتورة",
    noCustomers: "لا يوجد عملاء بعد.",
    name: "الاسم",
    documents: "المستندات",
    action: "الإجراء",
    recent: "المستندات الأخيرة",
    noRecent: "لا توجد مستندات بعد.",
    item: "عنصر",
    discountLabel: "الخصم",
    bill: "فاتورة إلى",
    yourBusiness: "نشاطك التجاري",
    thankYou: "شكراً لتعاملك معنا!",
    popBlocked: "تم حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة.",
    copyDone: "تم نسخ التذكير.",
    pdfMessage: "تم فتح نافذة PDF. احفظ الملف وأرفقه في واتساب.",
    limit: "تم الوصول إلى حد 10 فواتير شهرياً في الخطة المجانية.",
    customerRequired: "يرجى إدخال اسم العميل أولاً.",
    descriptionRequired: "يرجى إدخال وصف لكل عنصر.",
    login: "لم يتم العثور على جلسة الدخول. يرجى تسجيل الدخول مجدداً.",
    saved: "تم الحفظ بنجاح!",
    no: "لا",
    editDetails: "تم تحميل التفاصيل. سيؤدي الحفظ إلى إنشاء مستند جديد.",
    planLoad: "جارٍ تحميل الاشتراك. يرجى الانتظار.",
    month: "شهر",
  },
};

const toSafeNumber = (value: number | string | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

const localeForLanguage: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ar: "ar-AE",
};

function formatMoney(
  amount: number,
  currencyCode = "USD",
  language = "en"
) {
  try {
    return new Intl.NumberFormat(
      localeForLanguage[language] || "en-US",
      {
        style: "currency",
        currency: currencyCode,
      }
    ).format(Number(amount) || 0);
  } catch {
    return `${currencyCode} ${(Number(amount) || 0).toFixed(2)}`;
  }
}

const getMonthStart = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isCreatedThisMonth = (
  createdAt: string | null | undefined,
  monthStart: Date
) => {
  if (!createdAt) return false;
  const time = Date.parse(createdAt);
  return Number.isFinite(time) && new Date(time) >= monthStart;
};

const buildDocumentNumber = (type: string, docs: Doc[]) => {
  const prefix = type === "Invoice" ? "INV" : "QUO";

  const last = docs
    .filter((doc) => doc.type === type)
    .map((doc) => {
      const match = doc.number.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, value) => Math.max(max, value), 0);

  return `${prefix}-${String(last + 1).padStart(3, "0")}`;
};

export default function Dashboard() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const { currency, language } = useLocale();

  const tr = (key: string) =>
    translations[language]?.[key] || translations.en[key] || key;

  const [docs, setDocs] = useState<Doc[]>([]);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("Invoice");
  const [items, setItems] = useState<Item[]>([
    { description: "Website design", qty: 1, price: 500 },
  ]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business!");
  const [ai, setAi] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("Dashboard");
  const [isPro, setIsPro] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(0, Number(item.qty) || 0) *
            Math.max(0, Number(item.price) || 0),
        0
      ),
    [items]
  );

  const safeDiscount = Math.min(
    subtotal,
    Math.max(0, Number(discount) || 0)
  );

  const total =
    Math.max(0, subtotal - safeDiscount) *
    (1 + Math.max(0, Number(tax) || 0) / 100);

  const monthStart = useMemo(() => getMonthStart(), []);

  const usedThisMonth = docs.filter((doc) =>
    isCreatedThisMonth(doc.created_at, monthStart)
  ).length;

  const customers = useMemo(
    () =>
      Array.from(
        new Map(
          docs
            .filter((doc) => doc.customer?.trim())
            .map((doc) => [
              doc.customer.trim().toLowerCase(),
              {
                name: doc.customer.trim(),
                email: doc.email || "",
              },
            ])
        ).values()
      ),
    [docs]
  );

  async function loadDocs() {
    setSubscriptionLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setIsPro(false);
        setMessage(
          authError?.message || "Login session not found. Please log in again."
        );
        router.replace("/login");
        return;
      }

      const { data: subscription, error: subscriptionError } =
        await supabase
          .from("subscriptions")
          .select("plan,status,current_period_end,razorpay_mode")
          .eq("user_id", user.id)
          .maybeSingle();

      if (subscriptionError) {
        console.error("Subscription load error:", subscriptionError.message);
        setIsPro(false);
        setMessage("Subscription status could not be loaded. Check Supabase RLS policy.");
      } else {
        const isSubscriptionDateValid =
          !subscription?.current_period_end ||
          new Date(subscription.current_period_end).getTime() > Date.now();

        setIsPro(
          subscription?.plan === "pro" &&
            subscription?.status === "active" &&
            subscription?.razorpay_mode === "live" &&
            isSubscriptionDateValid
        );
      }

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("Documents could not load: " + error.message);
        return;
      }

      setDocs((data || []) as Doc[]);
    } catch (error) {
      setIsPro(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Data could not load. Please try again."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  }

  useEffect(() => {
    void loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upgradeToPro() {
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setMessage(tr("login"));
        router.push("/login");
        return;
      }

      const razorpayWindow = window as any;

      if (!razorpayWindow.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          ) as HTMLScriptElement | null;

          if (existingScript) {
            existingScript.addEventListener("load", () => resolve(), {
              once: true,
            });
            existingScript.addEventListener(
              "error",
              () => reject(new Error("Razorpay could not load.")),
              { once: true }
            );

            if (razorpayWindow.Razorpay) resolve();
            return;
          }

          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Razorpay could not load. Check your internet."));

          document.body.appendChild(script);
        });
      }

      const response = await fetch("/api/subscription/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({ plan: "monthly" }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Subscription could not be created.");
      }

      if (!result.keyId || !result.subscriptionId) {
        throw new Error("Razorpay subscription details were not received.");
      }

      if (!razorpayWindow.Razorpay) {
        throw new Error("Razorpay checkout could not load.");
      }

      const checkout = new razorpayWindow.Razorpay({
        key: result.keyId,
        subscription_id: result.subscriptionId,
        name: "InvoiceAI",
        description: "Pro Monthly Subscription",

        handler: async (payment: any) => {
          try {
            const verifyResponse = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + session.access_token,
              },
              body: JSON.stringify({
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_subscription_id:
                  payment.razorpay_subscription_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });

            const verified = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok) {
              setMessage(
                verified.error || "Payment verification failed. Check payment status."
              );
              return;
            }

            if (verified.status !== "active") {
              setMessage(
                "Payment verified, but the subscription is not active yet. Please wait for activation."
              );
              return;
            }

            await loadDocs();
            setMessage("Congratulations! InvoiceAI Pro is active.");
          } catch {
            setMessage("Could not connect to verification server. Check payment status.");
          }
        },

        modal: {
          ondismiss: () => {
            setMessage(
              "Checkout closed. If you paid, do not pay again until the payment status is checked."
            );
          },
        },

        theme: { color: "#6C3BEE" },
      });

      checkout.open();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be started."
      );
    }
  }

  function updateItem(index: number, key: keyof Item, value: string) {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        if (key === "description") return { ...item, description: value };

        const numericValue = Math.max(0, Number(value) || 0);
        if (key === "qty") return { ...item, qty: numericValue };
        return { ...item, price: numericValue };
      })
    );
  }

  async function save() {
    setMessage("");

    if (subscriptionLoading) {
      setMessage(tr("planLoad"));
      return;
    }

    const currentMonthCount = docs.filter((doc) =>
      isCreatedThisMonth(doc.created_at, getMonthStart())
    ).length;

    if (!isPro && currentMonthCount >= 10) {
      setView("Pricing");
      setMessage(tr("limit"));
      return;
    }

    if (!customer.trim()) {
      setMessage(tr("customerRequired"));
      return;
    }

    if (!items.length || items.some((item) => !item.description.trim())) {
      setMessage(tr("descriptionRequired"));
      return;
    }

    setBusy(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage(tr("login"));
        router.push("/login");
        return;
      }

      const number = buildDocumentNumber(type, docs);

      const row = {
        user_id: user.id,
        number,
        type,
        customer: customer.trim(),
        email: email.trim(),
        items,
        tax: toSafeNumber(tax),
        discount: safeDiscount,
        notes,
        total,
        currency,
        status: "Pending",
      };

      const { data, error } = await supabase
        .from("documents")
        .insert(row)
        .select()
        .single();

      if (error) {
        setMessage("Save failed: " + error.message);
        return;
      }

      if (data) setDocs((current) => [data as Doc, ...current]);

      setMessage(`${number} ${tr("saved")}`);
      setView("Invoices");
    } catch {
      setMessage("Document could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function generateAI() {
    setLoading(true);
    setAi("");
    setMessage("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, type, items, total }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setAi(result.error || "AI reminder could not be created.");
      } else {
        setAi(result.text || "No text received from AI.");
      }
    } catch {
      setAi("Check your internet or server connection.");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(doc: Doc, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("documents")
      .update({ status })
      .eq("id", doc.id);

    if (error) {
      setMessage("Status update failed: " + error.message);
      return;
    }

    setDocs((current) =>
      current.map((item) =>
        item.id === doc.id ? { ...item, status } : item
      )
    );

    setMessage(`${doc.number} status updated.`);
  }

  async function deleteDoc(doc: Doc) {
    if (!window.confirm(`${doc.number} delete?`)) return;

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      setMessage("Delete failed: " + error.message);
      return;
    }

    setDocs((current) => current.filter((item) => item.id !== doc.id));
    setMessage(`${doc.number} deleted.`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function downloadPDF(doc?: Doc) {
    const invoice = doc || {
      number: "DRAFT",
      type,
      customer,
      email,
      items,
      tax,
      discount: safeDiscount,
      notes,
      total,
      currency,
    };

    const invoiceCurrency = invoice.currency || currency;

    const subtotalAmount = invoice.items.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0) * Number(item.price || 0),
      0
    );

    const discountAmount = Number(invoice.discount || 0);
    const taxAmount =
      Math.max(0, subtotalAmount - discountAmount) *
      (Number(invoice.tax || 0) / 100);

    const escapeHtml = (value: unknown) =>
      String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };
        return entities[char];
      });

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setMessage(tr("popBlocked"));
      return;
    }

    const rows = invoice.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.description)}</td>
            <td>${Number(item.qty)}</td>
            <td>${escapeHtml(formatMoney(Number(item.price), invoiceCurrency, language))}</td>
            <td>${escapeHtml(formatMoney(Number(item.qty) * Number(item.price), invoiceCurrency, language))}</td>
          </tr>
        `
      )
      .join("");

    const pdfLabels: Record<string, Record<string, string>> = {
      en: { bill: "Bill To", description: "Description", qty: "Qty", price: "Price", amount: "Amount", subtotal: "Subtotal", discount: "Discount", tax: "Tax", total: "Total", notes: "Notes" },
      hi: { bill: "बिल प्राप्तकर्ता", description: "विवरण", qty: "मात्रा", price: "कीमत", amount: "राशि", subtotal: "उप-कुल", discount: "छूट", tax: "टैक्स", total: "कुल", notes: "नोट्स" },
      es: { bill: "Facturar a", description: "Descripción", qty: "Cant.", price: "Precio", amount: "Importe", subtotal: "Subtotal", discount: "Descuento", tax: "Impuesto", total: "Total", notes: "Notas" },
      fr: { bill: "Facturer à", description: "Description", qty: "Qté", price: "Prix", amount: "Montant", subtotal: "Sous-total", discount: "Remise", tax: "Taxe", total: "Total", notes: "Notes" },
      de: { bill: "Rechnung an", description: "Beschreibung", qty: "Menge", price: "Preis", amount: "Betrag", subtotal: "Zwischensumme", discount: "Rabatt", tax: "Steuer", total: "Gesamt", notes: "Notizen" },
      ar: { bill: "فاتورة إلى", description: "الوصف", qty: "الكمية", price: "السعر", amount: "المبلغ", subtotal: "المجموع الفرعي", discount: "الخصم", tax: "الضريبة", total: "الإجمالي", notes: "ملاحظات" },
    };

    const p = pdfLabels[language] || pdfLabels.en;
    const direction = language === "ar" ? "rtl" : "ltr";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${direction}">
        <head>
          <title>${escapeHtml(invoice.number)} - InvoiceAI</title>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6C3BEE; padding-bottom: 20px; }
            h1 { color: #6C3BEE; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: start; }
            .totals { margin: 30px 0 0 auto; width: 260px; }
            .totals p { display: flex; justify-content: space-between; }
            .grand { font-size: 22px; border-top: 2px solid #6C3BEE; padding-top: 12px; }
            .notes { margin-top: 40px; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>InvoiceAI</h1><p>${tr("yourBusiness")}</p></div>
            <div><h2>${escapeHtml(invoice.type)}</h2><p>${escapeHtml(invoice.number)}</p></div>
          </div>
          <h3>${p.bill}</h3>
          <p>${escapeHtml(invoice.customer)}</p>
          <p>${escapeHtml(invoice.email)}</p>
          <table>
            <thead><tr><th>${p.description}</th><th>${p.qty}</th><th>${p.price}</th><th>${p.amount}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <p><span>${p.subtotal}</span><b>${escapeHtml(formatMoney(subtotalAmount, invoiceCurrency, language))}</b></p>
            <p><span>${p.discount}</span><b>-${escapeHtml(formatMoney(discountAmount, invoiceCurrency, language))}</b></p>
            <p><span>${p.tax}</span><b>${escapeHtml(formatMoney(taxAmount, invoiceCurrency, language))}</b></p>
            <p class="grand"><span>${p.total}</span><b>${escapeHtml(formatMoney(Number(invoice.total), invoiceCurrency, language))}</b></p>
          </div>
          <div class="notes"><h3>${p.notes}</h3><p>${escapeHtml(invoice.notes)}</p></div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
  }

  function sendWhatsApp(doc?: Doc) {
    const name = doc?.customer || customer || "there";
    const amount = formatMoney(
      Number(doc?.total ?? total),
      doc?.currency || currency,
      language
    );
    const number = doc?.number ? ` (${doc.number})` : "";

    const messages: Record<string, string> = {
      en: `Hello ${name}, friendly reminder that invoice${number} for ${amount} is awaiting payment. Please find the invoice PDF attached. Thank you!`,
      hi: `नमस्ते ${name}, ${amount} के इनवॉइस${number} का भुगतान बाकी है। कृपया संलग्न PDF देखें। धन्यवाद!`,
      es: `Hola ${name}, le recordamos que la factura${number} por ${amount} está pendiente de pago. ¡Gracias!`,
      fr: `Bonjour ${name}, nous vous rappelons que la facture${number} de ${amount} est en attente de paiement. Merci !`,
      de: `Hallo ${name}, dies ist eine freundliche Erinnerung: Die Rechnung${number} über ${amount} ist noch offen. Vielen Dank!`,
      ar: `مرحباً ${name}، نذكرك بأن الفاتورة${number} بمبلغ ${amount} بانتظار الدفع. شكراً لك!`,
    };

    const text = messages[language] || messages.en;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    downloadPDF(doc);
    setMessage(tr("pdfMessage"));
  }

  const navItems: View[] = [
    "Dashboard",
    "Create invoice",
    "Invoices",
    "Customers",
    "Pricing",
  ];

  const navLabels: Record<View, string> = {
    Dashboard: tr("dashboard"),
    "Create invoice": tr("create"),
    Invoices: tr("invoices"),
    Customers: tr("customers"),
    Pricing: tr("pricing"),
  };

  return (
    <main className="dash" dir={language === "ar" ? "rtl" : "ltr"}>
      <header>
        <div className="brand">
          <img
            src="/invoiceai-logo.png"
            alt="InvoiceAI Logo"
            style={{
              width: "160px",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div>
          <span className="plan-label">
            {subscriptionLoading
              ? tr("checking")
              : isPro
                ? tr("pro")
                : tr("free")}
          </span>
          <button className="linkbtn" onClick={logout}>
            {tr("logout")}
          </button>
        </div>
      </header>

      <div className="dashgrid">
        <aside className="sidecard no-print">
          <h3>{tr("workspace")}</h3>

          {navItems.map((item) => (
            <button
              key={item}
              className={`navitem ${view === item ? "active" : ""}`}
              onClick={() => {
                setView(item);
                setMessage("");
              }}
            >
              {item === "Dashboard"
                ? "▦ "
                : item === "Create invoice"
                  ? "＋ "
                  : item === "Invoices"
                    ? "▤ "
                    : item === "Customers"
                      ? "♙ "
                      : "＄ "}
              {navLabels[item]}
            </button>
          ))}

          <hr />
          <small>{isPro ? tr("pro") : tr("free")}</small>
          <p>
            {subscriptionLoading
              ? tr("checking")
              : isPro
                ? tr("active")
                : `${usedThisMonth}/10 invoices this month`}
          </p>

          {!isPro && (
            <button className="lightbtn" onClick={() => setView("Pricing")}>
              {tr("viewPlans")}
            </button>
          )}
        </aside>

        <section>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}

          {view === "Dashboard" && (
            <>
              <div className="welcome">
                <div>
                  <h1>{tr("welcome")}</h1>
                  <p className="muted">{tr("welcomeText")}</p>
                </div>
                <button className="btn" onClick={() => setView("Create invoice")}>
                  ＋ {tr("create")}
                </button>
              </div>

              <div className="panel">
                <h3>{tr("quick")}</h3>
                <div className="two">
                  <p>{tr("totalDocs")}<br /><b>{docs.length}</b></p>
                  <p>{tr("pendingPayments")}<br /><b>{docs.filter((doc) => doc.status !== "Paid").length}</b></p>
                </div>
                <p>{tr("currentPlan")}: <b>{isPro ? "Pro" : "Free"}</b></p>
                <button className="btn" onClick={() => setView("Invoices")}>
                  {tr("viewInvoices")}
                </button>
              </div>
            </>
          )}

          {view === "Create invoice" && (
            <>
              <div className="welcome">
                <div>
                  <h1>{tr("create")} — {type === "Invoice" ? tr("invoices") : "Quote"}</h1>
                  <p className="muted">{tr("enterDetails")}</p>
                  <p className="muted">Currency: <b>{currency}</b></p>
                </div>
                <button className="btn" onClick={save} disabled={busy}>
                  {busy ? tr("saving") : `${tr("save")} ${type}`}
                </button>
              </div>

              <div className="builder">
                <div className="panel">
                  <div className="two">
                    <label>
                      {tr("type")}
                      <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option>Invoice</option>
                        <option>Quote</option>
                      </select>
                    </label>
                    <label>
                      {tr("customer")}
                      <input
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        placeholder="John Smith"
                      />
                    </label>
                  </div>

                  <label>
                    {tr("email")}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </label>

                  <h3>{tr("items")}</h3>

                  {items.map((item, index) => (
                    <div className="item" key={index}>
                      <input
                        aria-label={tr("description")}
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder={tr("description")}
                      />
                      <input
                        aria-label={tr("quantity")}
                        type="number"
                        min="0"
                        value={item.qty}
                        onChange={(e) => updateItem(index, "qty", e.target.value)}
                      />
                      <input
                        aria-label={tr("price")}
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.length > 1
                              ? current.filter((_, i) => i !== index)
                              : current
                          )
                        }
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="lightbtn"
                    onClick={() =>
                      setItems((current) => [
                        ...current,
                        { description: "", qty: 1, price: 0 },
                      ])
                    }
                  >
                    ＋ {tr("addItem")}
                  </button>

                  <div className="two">
                    <label>
                      {tr("tax")}
                      <input
                        type="number"
                        min="0"
                        value={tax}
                        onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </label>
                    <label>
                      {tr("discount")} ({currency})
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </label>
                  </div>

                  <label>
                    {tr("notes")}
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </label>

                  <button
                    type="button"
                    className="lightbtn"
                    onClick={generateAI}
                    disabled={loading}
                  >
                    {loading ? tr("generating") : `✨ ${tr("generate")}`}
                  </button>

                  {ai && (
                    <div className="ai">
                      <p>{ai}</p>
                      <button
                        type="button"
                        className="lightbtn"
                        onClick={() => {
                          void navigator.clipboard.writeText(ai);
                          setMessage(tr("copyDone"));
                        }}
                      >
                        {tr("copy")}
                      </button>
                      <button
                        type="button"
                        className="lightbtn"
                        onClick={() => sendWhatsApp()}
                      >
                        {tr("whatsapp")}
                      </button>
                    </div>
                  )}

                  <div className="no-print">
                    <button type="button" className="lightbtn" onClick={() => downloadPDF()}>
                      {tr("pdf")}
                    </button>
                    <button type="button" className="btn" onClick={save} disabled={busy}>
                      {busy ? tr("saving") : `${tr("save")} ${type}`}
                    </button>
                  </div>
                </div>

                <div className="invoice" id="invoice-preview">
                  <div className="invhead">
                    <b>{tr("yourBusiness")}</b>
                    <span>{type.toUpperCase()}</span>
                  </div>
                  <p className="muted">{tr("billTo")}</p>
                  <h3>{customer || tr("customer")}</h3>
                  <small>{email}</small>

                  <table>
                    <thead>
                      <tr>
                        <th>{tr("description")}</th>
                        <th>{tr("quantity")}</th>
                        <th>{tr("price")}</th>
                        <th>{tr("total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description || tr("item")}</td>
                          <td>{item.qty}</td>
                          <td>{formatMoney(Number(item.price), currency, language)}</td>
                          <td>{formatMoney(Number(item.qty) * Number(item.price), currency, language)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="sum">
                    <p>{tr("subtotal")} <b>{formatMoney(subtotal, currency, language)}</b></p>
                    <p>{tr("discount")} <b>-{formatMoney(safeDiscount, currency, language)}</b></p>
                    <p>{tr("tax")} <b>{formatMoney(Math.max(0, subtotal - safeDiscount) * (Math.max(0, tax) / 100), currency, language)}</b></p>
                    <h2>{tr("total")} <b>{formatMoney(total, currency, language)}</b></h2>
                  </div>
                  <p className="note">{notes}</p>
                </div>
              </div>
            </>
          )}

          {view === "Invoices" && (
            <>
              <div className="welcome">
                <div>
                  <h1>{tr("invoiceQuotes")}</h1>
                  <p className="muted">{tr("manage")}</p>
                </div>
                <button className="btn" onClick={() => setView("Create invoice")}>
                  ＋ {tr("createNew")}
                </button>
              </div>

              <div className="panel">
                {docs.length === 0 ? (
                  <p>{tr("noDocs")}</p>
                ) : (
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{tr("number")}</th>
                          <th>{tr("customer")}</th>
                          <th>{tr("total")}</th>
                          <th>{tr("status")}</th>
                          <th>{tr("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((doc) => (
                          <tr key={doc.id}>
                            <td>{doc.number}<br /><small>{doc.type}</small></td>
                            <td>{doc.customer}<br /><small>{doc.email}</small></td>
                            <td>{formatMoney(Number(doc.total), doc.currency || currency, language)}</td>
                            <td>
                              <select
                                aria-label={`Status for ${doc.number}`}
                                value={doc.status}
                                onChange={(e) => void changeStatus(doc, e.target.value)}
                              >
                                <option value="Pending">{language === "hi" ? "बाकी" : language === "es" ? "Pendiente" : language === "fr" ? "En attente" : language === "de" ? "Ausstehend" : language === "ar" ? "قيد الانتظار" : "Pending"}</option>
                                <option value="Paid">{language === "hi" ? "भुगतान हुआ" : language === "es" ? "Pagado" : language === "fr" ? "Payé" : language === "de" ? "Bezahlt" : language === "ar" ? "مدفوع" : "Paid"}</option>
                                <option value="Overdue">{language === "hi" ? "देय तिथि पार" : language === "es" ? "Vencido" : language === "fr" ? "En retard" : language === "de" ? "Überfällig" : language === "ar" ? "متأخر" : "Overdue"}</option>
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="lightbtn"
                                onClick={() => {
                                  setCustomer(doc.customer);
                                  setEmail(doc.email);
                                  setType(doc.type);
                                  setItems(doc.items?.length ? doc.items : [{ description: "", qty: 1, price: 0 }]);
                                  setTax(Number(doc.tax) || 0);
                                  setDiscount(Number(doc.discount) || 0);
                                  setNotes(doc.notes || "");
                                  setView("Create invoice");
                                  setMessage(tr("editDetails"));
                                }}
                              >
                                {tr("editCopy")}
                              </button>{" "}
                              <button type="button" className="lightbtn" onClick={() => sendWhatsApp(doc)}>
                                WhatsApp
                              </button>{" "}
                              <button type="button" className="lightbtn" onClick={() => void deleteDoc(doc)}>
                                {tr("delete")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {view === "Pricing" && (
            <>
              <div className="welcome">
                <div>
                  <h1>{tr("plans")}</h1>
                  <p className="muted">{tr("choosePlan")}</p>
                </div>
              </div>

              <div className="pricing-grid">
                <div className="panel pricing-card">
                  <p className="muted">{tr("start")}</p>
                  <h2>Free</h2>
                  <h1>₹0 <small>/ {tr("month")}</small></h1>
                  <p>{tr("forSmall")}</p>
                  <ul>
                    <li>{tr("ten")}</li>
                    <li>{tr("pdfFeature")}</li>
                    <li>{tr("customerFeature")}</li>
                    <li>{tr("reminderFeature")}</li>
                    <li>{tr("statusFeature")}</li>
                  </ul>
                  <button className="lightbtn" disabled>
                    {isPro ? tr("current") : tr("current")}
                  </button>
                </div>

                <div className="panel pricing-card featured">
                  <p className="muted">{tr("growing")}</p>
                  <h2>Pro</h2>
                  <h1>₹199 <small>/ {tr("month")}</small></h1>
                  <p>{tr("forBusiness")}</p>
                  <ul>
                    <li>{tr("unlimited")}</li>
                    <li>{tr("allFree")}</li>
                    <li>{tr("branding")}</li>
                    <li>{tr("updates")}</li>
                  </ul>

                  {isPro ? (
                    <button className="lightbtn" disabled>{tr("proActive")}</button>
                  ) : (
                    <button className="btn" onClick={upgradeToPro} disabled={subscriptionLoading}>
                      {tr("upgrade")}
                    </button>
                  )}
                  <p className="muted pricing-note">{tr("secure")}</p>
                </div>
              </div>
            </>
          )}

          {view === "Customers" && (
            <>
              <div className="welcome">
                <div>
                  <h1>{tr("customers")}</h1>
                  <p className="muted">{tr("customerText")}</p>
                </div>
                <button className="btn" onClick={() => setView("Create invoice")}>
                  ＋ {tr("addCustomer")}
                </button>
              </div>

              <div className="panel">
                {customers.length === 0 ? (
                  <p>{tr("noCustomers")}</p>
                ) : (
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{tr("name")}</th>
                          <th>{tr("email")}</th>
                          <th>{tr("documents")}</th>
                          <th>{tr("action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((person) => (
                          <tr key={person.name.toLowerCase()}>
                            <td>{person.name}</td>
                            <td>{person.email || "—"}</td>
                            <td>
                              {docs.filter((doc) => doc.customer?.toLowerCase() === person.name.toLowerCase()).length}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="lightbtn"
                                onClick={() => {
                                  setCustomer(person.name);
                                  setEmail(person.email);
                                  setView("Create invoice");
                                }}
                              >
                                {tr("create")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {view !== "Create invoice" && (
            <div className="panel recent">
              <h3>{tr("recent")}</h3>
              {docs.length === 0 ? (
                <p>{tr("noRecent")}</p>
              ) : (
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{tr("number")}</th>
                        <th>{tr("customer")}</th>
                        <th>{tr("total")}</th>
                        <th>{tr("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.slice(0, 5).map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.number}</td>
                          <td>{doc.customer}</td>
                          <td>{formatMoney(Number(doc.total), doc.currency || currency, language)}</td>
                          <td>{doc.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
