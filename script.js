/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionButton = document.getElementById("clearSelection");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const selectedProducts = [];
const messages = [];
const workerUrl = "https://loreal-routine-bot.wsteven446.workers.dev/";
let allProducts = [];
const selectedProductsKey = "lorealSelectedProductIds";
let isRequestInProgress = false;
let routineReady = false;

// Keep chat disabled until a routine has been generated
userInput.disabled = true;
sendButton.disabled = true;

/* Disable controls while the AI is generating a routine or reply */
function setBusyControls(isBusy) {
  isRequestInProgress = isBusy;
  categoryFilter.disabled = isBusy;
  productSearch.disabled = isBusy;
  clearSelectionButton.disabled = isBusy;
  generateRoutineButton.disabled =
    isBusy || selectedProducts.length === 0;
  userInput.disabled = isBusy || !routineReady;
  sendButton.disabled = isBusy || !routineReady;

  document.querySelectorAll(".remove-product").forEach((button) => {
    button.disabled = isBusy;
  });

  document.querySelectorAll(".product-card").forEach((card) => {
    card.classList.toggle("busy", isBusy);
  });
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  if (!response.ok) {
    throw new Error("The product catalog could not be loaded.");
  }
  const data = await response.json();
  allProducts = data.products;

  // Restore selected products from the browser after the product data loads
  let savedIds = [];
  try {
    savedIds = JSON.parse(
      localStorage.getItem(selectedProductsKey) || "[]"
    );
  } catch (error) {
    localStorage.removeItem(selectedProductsKey);
  }
  selectedProducts.length = 0;
  savedIds.forEach((id) => {
    const savedProduct = allProducts.find((product) => product.id === id);
    if (savedProduct) {
      selectedProducts.push(savedProduct);
    }
  });

  displaySelectedProducts();
  return data.products;
}

/* Save selected product IDs so the selection survives a page reload */
function saveSelectedProducts() {
  const selectedIds = selectedProducts.map((product) => product.id);
  localStorage.setItem(selectedProductsKey, JSON.stringify(selectedIds));
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => {
        // Keep selected products marked and grayed out in the products grid
        const isSelected = selectedProducts.some(
          (selectedProduct) => selectedProduct.id === product.id
        );

        return `
    <div class="product-card${isSelected ? " selected" : ""}" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <p class="product-description">${product.description}</p>
      </div>
    </div>
  `;
      }
    )
    .join("");

  // Add a click handler to each product card
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (isRequestInProgress) {
        return;
      }

      // Selected products can only be removed with their X button
      if (card.classList.contains("selected")) {
        return;
      }

      const productId = Number(card.dataset.id);
      toggleSelectedProduct(productId);
    });
  });
}

/* Add or remove a product from the selected products list */
function toggleSelectedProduct(productId) {
  if (isRequestInProgress) {
    return;
  }

  const selectedIndex = selectedProducts.findIndex(
    (product) => product.id === productId
  );

  if (selectedIndex === -1) {
    // Find the clicked product and add it to the selected list
    const product = allProducts.find((item) => item.id === productId);
    if (product) {
      selectedProducts.push(product);
    }
  } else {
    // Remove the product if it is clicked again
    selectedProducts.splice(selectedIndex, 1);
  }

  saveSelectedProducts();
  displaySelectedProducts();

  // Refresh with both the category and search filters
  filterProducts();
}

/* Show selected products in the selected products container */
function displaySelectedProducts() {
  clearSelectionButton.hidden = selectedProducts.length === 0;
  setBusyControls(isRequestInProgress);

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "";
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-card" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div>
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
          <button class="remove-product" type="button" aria-label="Remove ${product.name}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `
    )
    .join("");

  const removeButtons = document.querySelectorAll(".remove-product");
  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productId = Number(button.parentElement.dataset.id);
      toggleSelectedProduct(productId);
    });
  });
}

/* Filter products by category and search text */
function filterProducts() {
  const selectedCategory = categoryFilter.value;
  const searchText = productSearch.value.trim().toLowerCase();

  let filteredProducts =
    selectedCategory === "all" || selectedCategory === ""
      ? allProducts
      : allProducts.filter(
          (product) => product.category === selectedCategory
        );

  if (searchText) {
    filteredProducts = filteredProducts.filter((product) =>
      `${product.name} ${product.brand} ${product.category} ${product.description}`
        .toLowerCase()
        .includes(searchText)
    );
  }

  displayProducts(filteredProducts);
}

/* Remove all products from the selected products list */
clearSelectionButton.addEventListener("click", () => {
  if (isRequestInProgress) {
    return;
  }

  selectedProducts.length = 0;
  saveSelectedProducts();
  displaySelectedProducts();

  filterProducts();
});

/* Format simple Markdown text for the chat response */
function formatResponse(text) {
  const escapeHtml = (value) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const formatInline = (value) => {
    let formatted = escapeHtml(value);
    const markdownLinks = [];

    // Protect Markdown links before converting raw URLs
    formatted = formatted.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      (match, label, url) => {
        const placeholder = `__LINK_${markdownLinks.length}__`;
        markdownLinks.push(
          `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
        );
        return placeholder;
      }
    );

    // Convert raw http or https URLs into clickable links
    formatted = formatted.replace(
      /(^|[^"'=])(https?:\/\/[^\s<]+)/g,
      (match, prefix, url) => {
        const punctuation = /[.,!?;:]+$/.exec(url);
        const cleanUrl = punctuation ? url.slice(0, -punctuation[0].length) : url;
        const ending = punctuation ? punctuation[0] : "";
        return `${prefix}<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${ending}`;
      }
    );

    markdownLinks.forEach((link, index) => {
      formatted = formatted.replace(`__LINK_${index}__`, link);
    });

    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return formatted;
  };
  const lines = text.split("\n");
  const formattedLines = [];
  let listType = null;

  const closeList = () => {
    if (listType) {
      formattedLines.push(`</${listType}>`);
      listType = null;
    }
  };

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    const numberMatch = line.match(/^\s*\d+\.\s+(.+)/);

    if (bulletMatch || numberMatch) {
      const currentListType = bulletMatch ? "ul" : "ol";

      if (listType !== currentListType) {
        closeList();
        formattedLines.push(`<${currentListType}>`);
        listType = currentListType;
      }

      const itemText = bulletMatch ? bulletMatch[1] : numberMatch[1];
      formattedLines.push(`<li>${formatInline(itemText)}</li>`);
      return;
    }

    closeList();
    if (line.trim()) {
      formattedLines.push(`<p>${formatInline(line)}</p>`);
    }
  });

  closeList();
  return formattedLines.join("");
}

/* Send the conversation to the Cloudflare Worker */
async function sendMessage(
  message,
  unlockChatWhenFinished = false,
  loadingMessage = "Thinking..."
) {
  setBusyControls(true);
  messages.push({ role: "user", content: message });
  chatWindow.innerHTML = loadingMessage;

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI could not complete the request.");
    }

    // Web-search responses include extra output items before the message.
    // Find the message item first instead of assuming it is output[0].
    const messageOutput = data.output?.find(
      (item) => item.type === "message"
    );
    const reply =
      data.output_text ||
      messageOutput?.content?.find(
        (item) => item.type === "output_text"
      )?.text ||
      "The AI did not return a response.";
    messages.push({ role: "assistant", content: reply });

    // Display the AI response as text in the chat window
    chatWindow.innerHTML = "";
    const responseMessage = document.createElement("div");
    responseMessage.innerHTML = formatResponse(reply);
    chatWindow.appendChild(responseMessage);

    if (unlockChatWhenFinished) {
      routineReady = true;
    }

    setBusyControls(false);
  } catch (error) {
    messages.pop();
    chatWindow.innerHTML = `Error: ${error.message}`;

    if (unlockChatWhenFinished) {
      routineReady = false;
    }

    setBusyControls(false);
  }
}

/* Generate a routine using the selected products as AI context */
generateRoutineButton.addEventListener("click", () => {
  if (isRequestInProgress) {
    return;
  }

  const productContext = selectedProducts
    .map(
      (product) =>
        `${product.name} by ${product.brand}: ${product.description}`
    )
    .join("\n");

  sendMessage(
    `Create a personalized routine using only these selected products:\n${productContext}`,
    true,
    "Building your routine..."
  );
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", () => {
  if (isRequestInProgress) {
    return;
  }

  // The product data is already loaded, so apply the filters immediately
  filterProducts();
});

/* Update results whenever the search text changes */
productSearch.addEventListener("input", () => {
  if (isRequestInProgress) {
    return;
  }

  filterProducts();
});

/* Chat form submission handler */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (isRequestInProgress) {
    return;
  }

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  // Send the user's message to the configured Worker URL
  sendMessage(message);
  userInput.value = "";
});

// Load products once and show all products on page load
loadProducts().then(() => {
  filterProducts();
}).catch((error) => {
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      ${error.message}
    </div>
  `;
});
