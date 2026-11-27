import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { NetworkStatusProvider } from "./context/NetworkStatusContext.jsx";
import { OfflineBanner } from "./components/OfflineBanner.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
const Home = lazy(() => import("./pages/Home.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const ProductDetails = lazy(() => import("./pages/ProductDetails.jsx"));
const AIAssistant = lazy(() => import("./pages/AIAssistant.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.jsx"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const OrderDetails = lazy(() => import("./pages/OrderDetails.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const PCBuilder = lazy(() => import("./pages/PCBuilder.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
function App() {
  return /* @__PURE__ */ React.createElement(AuthProvider, null, /* @__PURE__ */ React.createElement(CartProvider, null, /* @__PURE__ */ React.createElement(NetworkStatusProvider, null, /* @__PURE__ */ React.createElement(OfflineBanner, null), /* @__PURE__ */ React.createElement(Navbar, null), /* @__PURE__ */ React.createElement(
    Suspense,
    {
      fallback: /* @__PURE__ */ React.createElement("div", { className: "page container" }, /* @__PURE__ */ React.createElement("div", { className: "loading-container" }, /* @__PURE__ */ React.createElement("div", { className: "loading-spinner" }), /* @__PURE__ */ React.createElement("p", { className: "text-text-muted" }, "Loading page\xE2\u20AC\xA6")))
    },
    /* @__PURE__ */ React.createElement(Routes, null, /* @__PURE__ */ React.createElement(Route, { path: "/", element: /* @__PURE__ */ React.createElement(Home, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/products", element: /* @__PURE__ */ React.createElement(Products, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/products/:id", element: /* @__PURE__ */ React.createElement(ProductDetails, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/ai-assistant", element: /* @__PURE__ */ React.createElement(ProtectedRoute, null, /* @__PURE__ */ React.createElement(AIAssistant, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/cart", element: /* @__PURE__ */ React.createElement(ProtectedRoute, null, /* @__PURE__ */ React.createElement(Cart, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/checkout", element: /* @__PURE__ */ React.createElement(ProtectedRoute, null, /* @__PURE__ */ React.createElement(Checkout, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/payment/success", element: /* @__PURE__ */ React.createElement(PaymentSuccess, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/payment/cancelled", element: /* @__PURE__ */ React.createElement(PaymentCancelled, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/orders", element: /* @__PURE__ */ React.createElement(ProtectedRoute, null, /* @__PURE__ */ React.createElement(Orders, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/orders/:id", element: /* @__PURE__ */ React.createElement(ProtectedRoute, null, /* @__PURE__ */ React.createElement(OrderDetails, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/login", element: /* @__PURE__ */ React.createElement(Login, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/register", element: /* @__PURE__ */ React.createElement(Register, null) }), /* @__PURE__ */ React.createElement(Route, { path: "/pc-builder", element: /* @__PURE__ */ React.createElement(ProtectedRoute, null, /* @__PURE__ */ React.createElement(PCBuilder, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "/admin", element: /* @__PURE__ */ React.createElement(ProtectedRoute, { requiredRole: "admin" }, /* @__PURE__ */ React.createElement(AdminDashboard, null)) }), /* @__PURE__ */ React.createElement(Route, { path: "*", element: /* @__PURE__ */ React.createElement(Navigate, { to: "/", replace: true }) }))
  ), /* @__PURE__ */ React.createElement(BottomNav, null))));
}
export default App;
