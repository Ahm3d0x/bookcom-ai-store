
// ==================== CONFIGURATION ====================
const GEMINI_API_KEY = 'AIzaSyDfTV1_AxKmOn-e1etgAVOn_0jIvW4kKCg';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
const INVENTORY_API_URL = 'https://sheetdb.io/api/v1/sxi67bbyq81eb';
const ORDERS_API_URL = 'https://sheetdb.io/api/v1/sxi67bbyq81eb';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// ==================== STATE ====================
let allBooks = [];
let conversationState = 'idle';
let orderDetails = { books: [], name: '', phone: '', address: '', currentBookIndex: 0 };
let conversationHistory = [];

// ==================== CUSTOM MODAL & NOTIFICATIONS ====================
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const colors = {
        success: 'from-green-500 to-emerald-600',
        error: 'from-red-500 to-rose-600',
        warning: 'from-amber-500 to-orange-600',
        info: 'from-blue-600 to-purple-800'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.className = `notification bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3`;
    notification.innerHTML = `
        <span class="text-2xl">${icons[type]}</span>
        <p class="flex-1 font-semibold">${message}</p>
        <button onclick="this.parentElement.remove()" class="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded-lg transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notification.remove(), 400);
    }, duration);
}

function showModal(title, message, icon, buttons = []) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalIcon = document.getElementById('modal-icon');
    const modalButtons = document.getElementById('modal-buttons');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalIcon.textContent = icon;
    
    modalButtons.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.className = `flex-1 py-3 px-4 rounded-xl font-bold transition-all ${btn.class || 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        button.onclick = () => {
            closeModal();
            if (btn.onClick) btn.onClick();
        };
        modalButtons.appendChild(button);
    });
    
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('custom-modal').classList.add('hidden');
}

function showConfirm(title, message, icon, onConfirm) {
    showModal(title, message, icon, [
        {
            text: 'إلغاء',
            class: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        },
        {
            text: 'تأكيد',
            class: 'bg-gradient-to-r from-blue-600 to-purple-800 text-white hover:shadow-lg',
            onClick: onConfirm
        }
    ]);
}

function showPromptModal(title, message, defaultValue = '', onConfirm) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalIcon = document.getElementById('modal-icon');
    const modalButtons = document.getElementById('modal-buttons');
    
    modalTitle.textContent = title;
    modalMessage.innerHTML = `
        <p class="mb-4">${message}</p>
        <input type="text" id="prompt-input" value="${defaultValue}" class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none">
    `;
    modalIcon.textContent = '✏️';
    
    modalButtons.innerHTML = '';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'إلغاء';
    cancelBtn.className = 'flex-1 py-3 px-4 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all';
    cancelBtn.onclick = closeModal;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'تأكيد';
    confirmBtn.className = 'flex-1 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-800 text-white hover:shadow-lg transition-all';
    confirmBtn.onclick = () => {
        const value = document.getElementById('prompt-input').value;
        closeModal();
        if (value && onConfirm) onConfirm(value);
    };
    
    modalButtons.appendChild(cancelBtn);
    modalButtons.appendChild(confirmBtn);
    
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('prompt-input').focus(), 100);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadOrdersCount();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('open-chat-btn').addEventListener('click', () => {
        document.getElementById('chat-widget').classList.remove('hidden');
        document.getElementById('open-chat-btn').classList.add('hidden');
    });
    
    document.getElementById('close-chat-btn').addEventListener('click', () => {
        document.getElementById('chat-widget').classList.add('hidden');
        document.getElementById('open-chat-btn').classList.remove('hidden');
    });
    
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBooks();
    });
}

// ==================== BOOKS MANAGEMENT ====================
async function loadBooks() {
    try {
        const response = await fetch(`${INVENTORY_API_URL}?sheet=المخزون`);
        allBooks = await response.json();
        displayBooks(allBooks);
        document.getElementById('total-books').textContent = allBooks.filter(b => parseInt(b.الكمية) > 0).length;
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('books-container').innerHTML = '<div class="col-span-full text-center text-white">⚠️ حدث خطأ في تحميل الكتب</div>';
        showNotification('حدث خطأ في تحميل الكتب', 'error');
    }
}

function displayBooks(books) {
    const container = document.getElementById('books-container');
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-white text-lg py-8">لا توجد كتب متاحة حالياً</div>';
        return;
    }
    
    container.innerHTML = books.filter(book => book['اسم الكتاب']).map((book, index) => {
        const quantity = parseInt(book.الكمية) || 0;
        const isAvailable = quantity > 0;
        return `
            <div class="glass book-card rounded-2xl p-5 slide-in" style="animation-delay: ${index * 0.05}s">
                <div class="bg-gradient-to-br from-blue-600 to-purple-800 rounded-xl h-48 mb-4 flex items-center justify-center text-6xl shadow-lg">
                    📖
                </div>
                <h3 class="text-white font-bold text-lg mb-2 line-clamp-2">${book['اسم الكتاب']}</h3>
                <p class="text-white text-sm opacity-80 mb-3">✍️ ${book.المؤلف || 'غير معروف'}</p>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-yellow-300 font-bold text-xl">${book.السعر} جنيه</span>
                    <span class="text-white text-sm ${isAvailable ? 'bg-green-500' : 'bg-red-500'} px-3 py-1 rounded-full">
                        ${isAvailable ? `✅ ${quantity} متوفر` : '❌ غير متوفر'}
                    </span>
                </div>
                <button onclick="quickOrder('${book['اسم الكتاب'].replace(/'/g, "\\'")}')" 
                        class="w-full ${isAvailable ? 'bg-gradient-to-r from-green-500 to-blue-600' : 'bg-gray-500 cursor-not-allowed'} text-white py-2 rounded-xl font-bold hover:shadow-lg transition-all"
                        ${!isAvailable ? 'disabled' : ''}>
                    ${isAvailable ? '🛒 اطلب الآن' : 'غير متوفر'}
                </button>
            </div>
        `;
    }).join('');
}

function searchBooks() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    if (!query) {
        displayBooks(allBooks);
        return;
    }
    const filtered = allBooks.filter(book => 
        book['اسم الكتاب']?.toLowerCase().includes(query) ||
        book.المؤلف?.toLowerCase().includes(query)
    );
    displayBooks(filtered);
}

function quickOrder(bookName) {
    document.getElementById('chat-widget').classList.remove('hidden');
    document.getElementById('open-chat-btn').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('message-input').value = `أريد طلب كتاب ${bookName}`;
        document.getElementById('chat-form').dispatchEvent(new Event('submit'));
    }, 500);
}

// ==================== CHAT BOT ====================
const ENHANCED_SYSTEM_PROMPT = `أنت "عمر"، مساعد ذكي محترف ومبدع لـ Book.com في مصر. شخصيتك تتميز بـ:

🎯 **المهارات الأساسية:**
- ذكي جداً في فهم نية العميل حتى لو كان الطلب غير واضح
- لبق ومقنع في التعامل مع العملاء
- ودود وصبور ومساعد
- متحمس لمساعدة العملاء في إيجاد أفضل الكتب

🔍 **القدرات الخاصة:**
- تفهم الأخطاء الإملائية وتصححها تلقائياً
- تقترح بدائل ذكية عند عدم توفر كتاب معين
- تتذكر سياق المحادثة بشكل ممتاز
- تتعامل مع طلبات متعددة في نفس الوقت

📋 **المهام:**
1. البحث عن الكتب (حتى مع أخطاء إملائية)
2. اقتراح كتب مشابهة أو في نفس المجال
3. أخذ طلبات شراء متعددة (يمكن طلب أكثر من كتاب)
4. جمع بيانات العميل بشكل طبيعي وودود

⚡ **طريقة الرد:**
- رد بشكل طبيعي ودافئ
- استخدم الإيموجي بشكل مناسب
- كن مختصراً لكن واضحاً
- اقترح حلول بديلة دائماً

الرجاء الرد بصيغة JSON فقط:
{
  "intent": "INTENT_NAME",
  "parameters": {},
  "reply": "الرد بالعربية",
  "suggestions": []
}

**الـ intents المتاحة:**
- SEARCH_BOOK: البحث عن كتاب - parameters: {"bookName": "اسم", "fuzzySearch": true/false}
- ADD_TO_ORDER: إضافة كتاب للطلب - parameters: {"bookName": "اسم", "quantity": رقم}
- RECOMMEND_BOOK: طلب توصية - parameters: {"category": "تصنيف اختياري"}
- CONFIRM_ORDER: تأكيد الطلب النهائي
- PROVIDE_INFO: تقديم معلومات (اسم، هاتف، عنوان)
- GREETING / GRATITUDE / GENERAL_CHAT

ملاحظات مهمة:
- إذا كان الاسم مكتوب بشكل خاطئ، ابحث عن أقرب تطابق
- اقترح كتب بديلة إذا لم يتوفر الكتاب المطلوب
- يمكن للعميل طلب أكثر من كتاب في نفس الطلب`;

async function handleChatSubmit(e) {
    e.preventDefault();
    const userMessage = document.getElementById('message-input').value.trim();
    if (!userMessage) return;

    addMessage(userMessage, 'user');
    document.getElementById('message-input').value = '';
    
    conversationHistory.push({ role: 'user', content: userMessage });
    
    setBotStatus('thinking', 'يفكر...');
    showTypingIndicator();

    if (conversationState.startsWith('ordering_')) {
        await handleOrderProcess(userMessage);
        return;
    }
    
    await getGeminiResponse(userMessage);
}

async function getGeminiResponse(userMessage) {
    const contextBooks = allBooks.slice(0, 20).map(b => `${b['اسم الكتاب']} - ${b.المؤلف}`).join(', ');
    
    const fullPrompt = `${ENHANCED_SYSTEM_PROMPT}

📚 بعض الكتب المتوفرة: ${contextBooks}

📜 سياق المحادثة الأخيرة:
${conversationHistory.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n')}

🔵 الطلب الحالي:
${conversationState !== 'idle' ? `حالة الطلب: ${conversationState}, الكتب المطلوبة: ${orderDetails.books.map(b => b.name).join(', ')}` : 'لا يوجد طلب نشط'}

💬 رسالة المستخدم: "${userMessage}"

ردك (JSON فقط):`;

    try {
        setBotStatus('typing', 'يكتب...');
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
            })
        });

        if (!response.ok) throw new Error('Gemini API Error');

        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text
            .replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResponse = JSON.parse(jsonText);
        
        conversationHistory.push({ role: 'assistant', content: aiResponse.reply });
        
        removeTypingIndicator();
        addMessage(aiResponse.reply, 'bot');
        
        if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
            addSuggestions(aiResponse.suggestions);
        }
        
        await executeAction(aiResponse);
        setBotStatus('online', 'متصل');

    } catch (error) {
        console.error('Gemini Error:', error);
        removeTypingIndicator();
        addMessage('عذراً، حدثت مشكلة في الاتصال. هل يمكنك إعادة المحاولة؟ 🔄', 'bot');
        setBotStatus('online', 'متصل');
    }
}

async function executeAction(aiResponse) {
    const { intent, parameters } = aiResponse;

    switch (intent) {
        case 'SEARCH_BOOK':
            await findBook(parameters.bookName, parameters.fuzzySearch);
            break;
        case 'ADD_TO_ORDER':
            addBookToOrder(parameters.bookName, parameters.quantity || 1);
            break;
        case 'RECOMMEND_BOOK':
            await recommendBook(parameters.category);
            break;
        case 'CONFIRM_ORDER':
            if (orderDetails.books.length > 0) {
                conversationState = 'ordering_name';
                addMessage('رائع! لإتمام الطلب، ما هو اسمك الكريم؟ 😊', 'bot');
            }
            break;
    }
}

async function findBook(bookName, fuzzySearch = true) {
    setBotStatus('thinking', 'يبحث...');
    showTypingIndicator();
    
    try {
        let foundBooks = [];
        
        foundBooks = allBooks.filter(book => 
            book['اسم الكتاب'] && 
            book['اسم الكتاب'].toLowerCase().includes(bookName.toLowerCase())
        );
        
        if (foundBooks.length === 0 && fuzzySearch) {
            const searchTerms = bookName.split(' ');
            foundBooks = allBooks.filter(book => {
                if (!book['اسم الكتاب']) return false;
                const bookTitle = book['اسم الكتاب'].toLowerCase();
                return searchTerms.some(term => bookTitle.includes(term.toLowerCase()));
            });
        }
        
        removeTypingIndicator();
        
        if (foundBooks.length > 0) {
            if (foundBooks.length === 1) {
                displaySingleBook(foundBooks[0]);
            } else {
                displayMultipleBooks(foundBooks.slice(0, 5), bookName);
            }
        } else {
            addMessage(`لم أجد كتاباً بهذا الاسم "${bookName}" 😔\n\nهل تريد أن أقترح عليك كتباً مشابهة؟`, 'bot');
            addSuggestions(['نعم، اقترح علي كتب', 'لا، شكراً']);
        }
        
        setBotStatus('online', 'متصل');
    } catch (error) {
        console.error('Search Error:', error);
        removeTypingIndicator();
        addMessage('عذراً، حدث خطأ أثناء البحث 😕', 'bot');
        setBotStatus('online', 'متصل');
    }
}

function displaySingleBook(book) {
    const quantity = parseInt(book.الكمية) || 0;
    const isAvailable = quantity > 0;
    
    const bookHTML = `
        <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 shadow-md">
            <div class="flex items-center gap-3 mb-3">
                <div class="text-4xl">📚</div>
                <div class="flex-1">
                    <h4 class="font-bold text-lg text-gray-800">${book['اسم الكتاب']}</h4>
                    <p class="text-sm text-gray-600">✍️ ${book.المؤلف || 'غير معروف'}</p>
                </div>
            </div>
            <div class="flex justify-between items-center mb-3">
                <span class="text-2xl font-bold text-orange-600">${book.السعر} جنيه 💰</span>
                <span class="text-sm px-3 py-1 rounded-full ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                    ${isAvailable ? `✅ متوفر (${quantity})` : '❌ غير متوفر'}
                </span>
            </div>
            ${isAvailable ? `
                <div class="space-y-2">
                    <button onclick="addBookToOrder('${book['اسم الكتاب'].replace(/'/g, "\\'")}', 1)" 
                            class="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-2 rounded-lg font-bold hover:shadow-lg transition-all">
                        ➕ أضف للطلب
                    </button>
                </div>
            ` : '<p class="text-center text-gray-500 text-sm">سنخبرك عند توفره 🔔</p>'}
        </div>
    `;
    
    addMessage(bookHTML, 'bot', true);
}

function displayMultipleBooks(books, searchTerm) {
    let html = `<div class="space-y-2"><p class="font-bold text-gray-800 mb-2">وجدت ${books.length} كتاب مطابق لـ "${searchTerm}":</p>`;
    
    books.forEach((book, index) => {
        const quantity = parseInt(book.الكمية) || 0;
        const isAvailable = quantity > 0;
        html += `
            <div class="bg-white rounded-lg p-3 shadow-sm border-2 border-gray-100">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <h5 class="font-bold text-gray-800">${index + 1}. ${book['اسم الكتاب']}</h5>
                        <p class="text-xs text-gray-600">${book.المؤلف || 'غير معروف'}</p>
                    </div>
                    <span class="text-orange-600 font-bold">${book.السعر} ج</span>
                </div>
                ${isAvailable ? `
                    <button onclick="addBookToOrder('${book['اسم الكتاب'].replace(/'/g, "\\'")}', 1)" 
                            class="w-full bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600 transition-all">
                        ➕ أضف (${quantity} متوفر)
                    </button>
                ` : '<p class="text-center text-red-500 text-xs">غير متوفر</p>'}
            </div>
        `;
    });
    
    html += '</div>';
    addMessage(html, 'bot', true);
}

function addBookToOrder(bookName, quantity = 1) {
    const book = allBooks.find(b => b['اسم الكتاب'] === bookName);
    if (!book) {
        addMessage('عذراً، لم أتمكن من العثور على هذا الكتاب 😕', 'bot');
        return;
    }
    
    const availableQty = parseInt(book.الكمية) || 0;
    if (availableQty < quantity) {
        showNotification(`المتوفر فقط ${availableQty} نسخة من هذا الكتاب`, 'warning');
        return;
    }
    
    const existingBook = orderDetails.books.find(b => b.name === bookName);
    if (existingBook) {
        existingBook.quantity += quantity;
        showNotification(`تم تحديث الكمية! الآن لديك ${existingBook.quantity} نسخة`, 'success');
    } else {
        orderDetails.books.push({
            name: bookName,
            quantity: quantity,
            price: parseFloat(book.السعر)
        });
        showNotification(`تم إضافة "${bookName}" للطلب بنجاح`, 'success');
    }
    
    setTimeout(() => {
        showOrderSummary();
    }, 500);
}

function showOrderSummary() {
    if (orderDetails.books.length === 0) return;
    
    const total = orderDetails.books.reduce((sum, book) => sum + (book.price * book.quantity), 0);
    
    let html = `
        <div class="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 shadow-md">
            <h4 class="font-bold text-gray-800 mb-3 text-center">🛒 طلبك الحالي</h4>
            <div class="space-y-2 mb-3">
    `;
    
    orderDetails.books.forEach((book, index) => {
        html += `
            <div class="flex justify-between items-center bg-white rounded-lg p-2 text-sm">
                <span class="font-semibold">${index + 1}. ${book.name}</span>
                <span class="text-gray-600">× ${book.quantity}</span>
                <span class="text-orange-600 font-bold">${(book.price * book.quantity).toFixed(2)} ج</span>
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="border-t-2 border-gray-300 pt-2 mb-3">
                <div class="flex justify-between items-center font-bold text-lg">
                    <span>الإجمالي:</span>
                    <span class="text-green-600">${total.toFixed(2)} جنيه 💰</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="continueOrder()" class="bg-gradient-to-r from-green-500 to-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
                    ✅ إتمام الطلب
                </button>
                <button onclick="addMoreBooks()" class="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
                    ➕ إضافة المزيد
                </button>
            </div>
        </div>
    `;
    
    addMessage(html, 'bot', true);
}

function continueOrder() {
    conversationState = 'ordering_name';
    addMessage('ممتاز! لإتمام طلبك، ما هو اسمك الكريم؟ 😊', 'bot');
}

function addMoreBooks() {
    addMessage('بالتأكيد! أخبرني عن الكتب الأخرى التي تريد إضافتها 📚', 'bot');
}

async function handleOrderProcess(message) {
    removeTypingIndicator();
    
    switch (conversationState) {
        case 'ordering_name':
            orderDetails.name = message;
            conversationState = 'ordering_phone';
            addMessage(`أهلاً بك ${orderDetails.name} 🌟\n\nما هو رقم هاتفك للتواصل؟`, 'bot');
            break;
            
        case 'ordering_phone':
            orderDetails.phone = message;
            conversationState = 'ordering_address';
            addMessage('رائع! آخر خطوة، ما هو عنوانك بالتفصيل؟ 📍', 'bot');
            break;
            
        case 'ordering_address':
            orderDetails.address = message;
            setBotStatus('thinking', 'يعالج الطلب...');
            showTypingIndicator();
            await finalizeOrder();
            break;
    }
}

async function finalizeOrder() {
    try {
        const orderData = {
            'تاريخ الطلب': new Date().toLocaleString('ar-EG'),
            'اسم العميل': orderDetails.name,
            'رقم الهاتف': orderDetails.phone,
            'العنوان': orderDetails.address,
            'الكتب المطلوبة': orderDetails.books.map(b => `${b.name} (×${b.quantity})`).join(' | '),
            'الإجمالي': orderDetails.books.reduce((sum, b) => sum + (b.price * b.quantity), 0).toFixed(2) + ' جنيه',
            'الحالة': 'جديد'
        };
        
        const orderResponse = await fetch(`${ORDERS_API_URL}?sheet=الطلبات`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (!orderResponse.ok) throw new Error('Order save failed');
        
        for (const orderedBook of orderDetails.books) {
            const book = allBooks.find(b => b['اسم الكتاب'] === orderedBook.name);
            if (book) {
                const newQuantity = parseInt(book.الكمية) - orderedBook.quantity;
                await updateBookQuantity(book['اسم الكتاب'], newQuantity);
            }
        }
        
        removeTypingIndicator();
        
        const successHTML = `
            <div class="bg-gradient-to-br from-green-100 to-blue-100 rounded-xl p-4 shadow-lg text-center">
                <div class="text-5xl mb-3">🎉</div>
                <h4 class="font-bold text-xl text-green-700 mb-2">تم تسجيل طلبك بنجاح!</h4>
                <p class="text-gray-700 mb-3">شكراً ${orderDetails.name}! سيتم التواصل معك قريباً على رقم ${orderDetails.phone}</p>
                <div class="bg-white rounded-lg p-3 mb-3 text-right">
                    <p class="text-sm text-gray-600 mb-1">📦 <strong>الكتب:</strong></p>
                    ${orderDetails.books.map(b => `<p class="text-sm">• ${b.name} (×${b.quantity})</p>`).join('')}
                    <p class="text-sm font-bold text-green-600 mt-2">💰 الإجمالي: ${orderDetails.books.reduce((sum, b) => sum + (b.price * b.quantity), 0).toFixed(2)} جنيه</p>
                </div>
                <p class="text-xs text-gray-500">رقم الطلب: #${Date.now()}</p>
            </div>
        `;
        
        addMessage(successHTML, 'bot', true);
        showNotification('تم تسجيل طلبك بنجاح! 🎉', 'success', 5000);
        
        setTimeout(() => {
            addMessage('هل تحتاج لأي مساعدة أخرى؟ 😊', 'bot');
        }, 1500);
        
        await loadBooks();
        resetConversation();
        setBotStatus('online', 'متصل');
        
    } catch (error) {
        console.error('Order Error:', error);
        removeTypingIndicator();
        addMessage('عذراً، حدثت مشكلة في تسجيل الطلب. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة 📞', 'bot');
        showNotification('حدث خطأ في تسجيل الطلب', 'error');
        resetConversation();
        setBotStatus('online', 'متصل');
    }
}

async function updateBookQuantity(bookName, newQuantity) {
    try {
        await fetch(`${INVENTORY_API_URL}/اسم الكتاب/${encodeURIComponent(bookName)}?sheet=المخزون`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ الكمية: newQuantity })
        });
    } catch (error) {
        console.error('Quantity update error:', error);
    }
}

async function recommendBook(category) {
    setBotStatus('thinking', 'يختار...');
    showTypingIndicator();
    
    try {
        let availableBooks = allBooks.filter(book => 
            book && book['اسم الكتاب'] && parseInt(book.الكمية) > 0
        );
        
        if (category) {
            availableBooks = availableBooks.filter(book => 
                book['اسم الكتاب'].toLowerCase().includes(category.toLowerCase()) ||
                (book.المؤلف && book.المؤلف.toLowerCase().includes(category.toLowerCase()))
            );
        }
        
        removeTypingIndicator();
        
        if (availableBooks.length > 0) {
            const randomBooks = availableBooks
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            addMessage('إليك بعض الكتب المميزة التي أنصحك بها: ✨', 'bot');
            
            randomBooks.forEach(book => {
                setTimeout(() => displaySingleBook(book), 300);
            });
        } else {
            addMessage('عذراً، لا توجد كتب متاحة في هذا التصنيف حالياً 😔', 'bot');
        }
        
        setBotStatus('online', 'متصل');
    } catch (error) {
        console.error('Recommend error:', error);
        removeTypingIndicator();
        addMessage('عذراً، حدث خطأ أثناء اختيار الكتب 😕', 'bot');
        setBotStatus('online', 'متصل');
    }
}

// ==================== UI HELPERS ====================
function addMessage(text, sender, isHTML = false) {
    if (sender === 'bot') removeTypingIndicator();
    
    const container = document.createElement('div');
    container.classList.add('flex', 'mb-4', 'slide-in');
    container.classList.add(sender === 'user' ? 'justify-end' : 'justify-start');
    
    const bubble = document.createElement('div');
    bubble.classList.add('rounded-2xl', 'py-3', 'px-4', 'max-w-[280px]', 'shadow-md');
    
    if (sender === 'user') {
        bubble.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-purple-800', 'text-white', 'rounded-br-sm');
    } else {
        bubble.classList.add('bg-white', 'text-gray-800', 'rounded-bl-sm');
    }
    
    if (isHTML) {
        bubble.innerHTML = text;
    } else {
        bubble.textContent = text;
    }
    
    container.appendChild(bubble);
    document.getElementById('chat-messages').appendChild(container);
    scrollToBottom();
}

function addSuggestions(suggestions) {
    const container = document.createElement('div');
    container.classList.add('flex', 'flex-wrap', 'gap-2', 'mb-4', 'justify-start', 'slide-in');
    
    suggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.textContent = suggestion;
        btn.classList.add('bg-gradient-to-r', 'from-purple-100', 'to-blue-100', 'text-gray-700', 'px-3', 'py-2', 'rounded-full', 'text-sm', 'hover:shadow-md', 'transition-all', 'border-2', 'border-purple-200');
        btn.onclick = () => {
            document.getElementById('message-input').value = suggestion;
            document.getElementById('chat-form').dispatchEvent(new Event('submit'));
        };
        container.appendChild(btn);
    });
    
    document.getElementById('chat-messages').appendChild(container);
    scrollToBottom();
}

function showTypingIndicator() {
    if (document.querySelector('.typing-indicator')) return;
    
    const container = document.createElement('div');
    container.classList.add('flex', 'justify-start', 'mb-4', 'typing-indicator');
    container.innerHTML = `
        <div class="bg-gray-200 rounded-2xl rounded-bl-sm py-3 px-4 shadow-md">
            <div class="bot-thinking">
                <span class="inline-block w-2 h-2 bg-gray-500 rounded-full mx-0.5"></span>
                <span class="inline-block w-2 h-2 bg-gray-500 rounded-full mx-0.5"></span>
                <span class="inline-block w-2 h-2 bg-gray-500 rounded-full mx-0.5"></span>
            </div>
        </div>
    `;
    document.getElementById('chat-messages').appendChild(container);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}

function setBotStatus(status, text) {
    const indicator = document.getElementById('bot-status-indicator');
    const statusText = document.getElementById('bot-status-text');
    
    indicator.className = 'status-indicator';
    
    switch(status) {
        case 'online':
            indicator.classList.add('status-online');
            break;
        case 'thinking':
            indicator.classList.add('status-thinking');
            break;
        case 'typing':
            indicator.classList.add('status-typing');
            break;
    }
    
    statusText.textContent = text;
}

function scrollToBottom() {
    const messages = document.getElementById('chat-messages');
    messages.scrollTop = messages.scrollHeight;
}

function resetConversation() {
    conversationState = 'idle';
    orderDetails = { books: [], name: '', phone: '', address: '', currentBookIndex: 0 };
}

// ==================== ADMIN PANEL ====================
function showAdminLogin() {
    document.getElementById('admin-login-modal').classList.remove('hidden');
}

function closeAdminLogin() {
    document.getElementById('admin-login-modal').classList.add('hidden');
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
}

function adminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        closeAdminLogin();
        document.getElementById('main-page').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadAdminBooks();
        showNotification('مرحباً بك في لوحة التحكم! 👋', 'success');
    } else {
        showModal(
            'خطأ في تسجيل الدخول',
            'اسم المستخدم أو كلمة المرور غير صحيحة!',
            '❌',
            [{
                text: 'حاول مرة أخرى',
                class: 'bg-gradient-to-r from-blue-600 to-purple-800 text-white hover:shadow-lg'
            }]
        );
    }
}

function logoutAdmin() {
    showConfirm(
        'تأكيد الخروج',
        'هل أنت متأكد من الخروج من لوحة التحكم؟',
        '🚪',
        () => {
            document.getElementById('admin-dashboard').classList.add('hidden');
            document.getElementById('main-page').classList.remove('hidden');
            loadBooks();
            showNotification('تم تسجيل الخروج بنجاح', 'info');
        }
    );
}

async function loadAdminBooks() {
    const container = document.getElementById('admin-books-list');
    container.innerHTML = '<div class="text-center text-gray-500 py-4">جاري التحميل...</div>';
    
    try {
        const response = await fetch(`${INVENTORY_API_URL}?sheet=المخزون`);
        const books = await response.json();
        
        if (books.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">لا توجد كتب في المخزون</div>';
            return;
        }
        
        container.innerHTML = books.map(book => `
            <div class="bg-gray-50 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition-all">
                <div class="flex-1">
                    <h4 class="font-bold text-gray-800">${book['اسم الكتاب']}</h4>
                    <p class="text-sm text-gray-600">المؤلف: ${book.المؤلف || 'غير محدد'}</p>
                    <p class="text-sm text-gray-600">السعر: ${book.السعر} جنيه | الكمية: ${book.الكمية}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick='editBook(${JSON.stringify(book["اسم الكتاب"])}, ${book.الكمية})' class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600">✏️</button>
                    <button onclick='deleteBook(${JSON.stringify(book["اسم الكتاب"])})' class="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="text-center text-red-500 py-4">حدث خطأ في التحميل</div>';
        showNotification('حدث خطأ في تحميل البيانات', 'error');
    }
}

async function addNewBook() {
    const name = document.getElementById('new-book-name').value.trim();
    const author = document.getElementById('new-book-author').value.trim();
    const price = document.getElementById('new-book-price').value.trim();
    const quantity = document.getElementById('new-book-quantity').value.trim();
    
    if (!name || !price || !quantity) {
        showModal(
            'بيانات ناقصة',
            'يرجى ملء جميع الحقول المطلوبة (اسم الكتاب، السعر، والكمية)',
            '⚠️',
            [{
                text: 'حسناً',
                class: 'bg-gradient-to-r from-blue-600 to-purple-800 text-white hover:shadow-lg'
            }]
        );
        return;
    }
    
    try {
        const response = await fetch(`${INVENTORY_API_URL}?sheet=المخزون`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'اسم الكتاب': name,
                'المؤلف': author || 'غير محدد',
                'السعر': price,
                'الكمية': quantity
            })
        });
        
        if (response.ok) {
            showNotification('تم إضافة الكتاب بنجاح! ✅', 'success');
            document.getElementById('new-book-name').value = '';
            document.getElementById('new-book-author').value = '';
            document.getElementById('new-book-price').value = '';
            document.getElementById('new-book-quantity').value = '';
            loadAdminBooks();
            loadBooks();
        } else {
            showNotification('حدث خطأ في الإضافة', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال', 'error');
    }
}

function editBook(bookName, currentQty) {
    showPromptModal(
        'تحديث كمية الكتاب',
        `تحديث كمية "${bookName}"\n\nالكمية الحالية: ${currentQty}\n\nأدخل الكمية الجديدة:`,
        currentQty,
        async (newQty) => {
            if (newQty && !isNaN(newQty)) {
                await updateBookQuantity(bookName, parseInt(newQty));
                showNotification('تم تحديث الكمية بنجاح! ✅', 'success');
                setTimeout(() => {
                    loadAdminBooks();
                    loadBooks();
                }, 500);
            } else {
                showNotification('يرجى إدخال رقم صحيح', 'warning');
            }
        }
    );
}

async function deleteBook(bookName) {
    showConfirm(
        'تأكيد الحذف',
        `هل أنت متأكد من حذف "${bookName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`,
        '🗑️',
        async () => {
            try {
                await fetch(`${INVENTORY_API_URL}/اسم الكتاب/${encodeURIComponent(bookName)}?sheet=المخزون`, {
                    method: 'DELETE'
                });
                showNotification('تم الحذف بنجاح! ✅', 'success');
                loadAdminBooks();
                loadBooks();
            } catch (error) {
                showNotification('حدث خطأ في الحذف', 'error');
            }
        }
    );
}

async function loadOrdersCount() {
    try {
        const response = await fetch(`${ORDERS_API_URL}?sheet=الطلبات`);
        const orders = await response.json();
        document.getElementById('total-orders').textContent = orders.length;
    } catch (error) {
        document.getElementById('total-orders').textContent = '0';
    }
}
