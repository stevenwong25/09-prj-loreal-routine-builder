/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProducts = [];
let allProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return data.products;
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

  displaySelectedProducts();

  // Refresh the currently selected category
  const selectedCategory = categoryFilter.value;
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
}

/* Show selected products in the selected products container */
function displaySelectedProducts() {
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

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  // Show a loading message while the product data is being loaded
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      Loading products...
    </div>
  `;

  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
