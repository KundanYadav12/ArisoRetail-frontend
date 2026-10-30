import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  PackagePlus,
  X,
  AlertTriangle,
  Check,
  Tag,
  Percent,
  Search,
  Link as LinkIcon,
  HelpCircle,
  Hash
} from "lucide-react";
import {
  sanitizePositiveNumberString,
  handleSelectAllOnFocus,
  handleSelectAllOnClick,
  handleSelectAllOnMouseUp
} from "../utils/numberInputUtils";
export default function OpenItemModal({
  isOpen,
  initialItem = null,
  menuItems = [],
  receiptSettings = null,
  onConfirm,
  onClose
}) {
  const descRef = useRef(null);
  const priceRef = useRef(null);
  const qtyRef = useRef(null);
  const discRef = useRef(null);
  const stockSearchRef = useRef(null);
  const defaultGstRate = useMemo(() => {
    if (receiptSettings && receiptSettings.gst_enabled === false) return 0;
    const rate = parseFloat(receiptSettings?.default_gst_rate);
    return !isNaN(rate) ? rate : 5;
  }, [receiptSettings]);
  const gstMode = receiptSettings?.gst_mode || "excluded";
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [selectedGstRate, setSelectedGstRate] = useState(defaultGstRate);
  const [customGstRate, setCustomGstRate] = useState("");
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [hsnCode, setHsnCode] = useState("");
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [linkToStock, setLinkToStock] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState(null);
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setDescription(initialItem.name || "");
        setPrice(String(initialItem.price !== void 0 ? initialItem.price : initialItem.unit_price || ""));
        setQuantity(String(initialItem.quantity || "1"));
        setUnit(initialItem.unit || "pcs");
        const rate = parseFloat(initialItem.gst_rate !== void 0 ? initialItem.gst_rate : 5);
        if ([0, 5, 12, 18, 28].includes(rate)) {
          setSelectedGstRate(rate);
          setCustomGstRate("");
        } else {
          setSelectedGstRate(-1);
          setCustomGstRate(String(rate));
        }
        setIsTaxExempt(Boolean(initialItem.is_tax_exempt) || rate === 0);
        setHsnCode(initialItem.hsn_code || initialItem.hsnCode || "");
        setDiscountType(initialItem.discount_type || "amount");
        setDiscountValue(
          initialItem.discount_value !== void 0 && initialItem.discount_value > 0 ? String(initialItem.discount_value) : initialItem.discount_amount ? String(initialItem.discount_amount) : ""
        );
        if (initialItem.is_stock_linked && (initialItem.product_id || initialItem.menu_item_id)) {
          setLinkToStock(true);
          const matched = menuItems.find(
            (p) => (p.id || p.menu_item_id) === (initialItem.product_id || initialItem.menu_item_id)
          );
          setLinkedProduct(matched || {
            id: initialItem.product_id || initialItem.menu_item_id,
            name: initialItem.linked_product_name || "Linked Product",
            unit: initialItem.unit || "pcs"
          });
        } else {
          setLinkToStock(false);
          setLinkedProduct(null);
        }
      } else {
        setDescription("");
        setPrice("");
        setQuantity("1");
        setUnit("pcs");
        setSelectedGstRate(defaultGstRate);
        setCustomGstRate("");
        setIsTaxExempt(defaultGstRate === 0);
        setHsnCode("");
        setDiscountType("amount");
        setDiscountValue("");
        setLinkToStock(false);
        setLinkedProduct(null);
      }
      setError("");
      setStockSearchTerm("");
      setShowStockDropdown(false);
      const timer = setTimeout(() => {
        if (descRef.current) {
          descRef.current.focus();
          descRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialItem, defaultGstRate, menuItems]);
  if (!isOpen) return null;
  const filteredStockProducts = (menuItems || []).filter((p) => {
    if (!stockSearchTerm.trim()) return true;
    const term = stockSearchTerm.toLowerCase();
    const name = (p.name || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    const barcode = (p.barcode || "").toLowerCase();
    return name.includes(term) || sku.includes(term) || barcode.includes(term);
  }).slice(0, 8);
  const numericPrice = parseFloat(price || "0");
  const numericQty = parseFloat(quantity || "1");
  const grossAmount = Math.max(0, numericPrice * (isNaN(numericQty) || numericQty <= 0 ? 1 : numericQty));
  const numericDiscount = parseFloat(discountValue || "0");
  let discountAmount = 0;
  if (!isNaN(numericDiscount) && numericDiscount > 0) {
    if (discountType === "percentage") {
      discountAmount = grossAmount * Math.min(100, numericDiscount) / 100;
    } else {
      discountAmount = Math.min(grossAmount, numericDiscount);
    }
  }
  const taxableAmount = Math.max(0, grossAmount - discountAmount);
  const effectiveGstRate = isTaxExempt ? 0 : selectedGstRate === -1 ? parseFloat(customGstRate) || 0 : selectedGstRate;
  let taxAmount = 0;
  let finalLineTotal = 0;
  if (effectiveGstRate > 0) {
    if (gstMode === "included") {
      const baseTaxable = taxableAmount / (1 + effectiveGstRate / 100);
      taxAmount = taxableAmount - baseTaxable;
      finalLineTotal = taxableAmount;
    } else {
      taxAmount = taxableAmount * (effectiveGstRate / 100);
      finalLineTotal = taxableAmount + taxAmount;
    }
  } else {
    taxAmount = 0;
    finalLineTotal = taxableAmount;
  }
  const trackInventory = linkedProduct && linkedProduct.track_inventory !== 0 && linkedProduct.current_stock !== null && linkedProduct.current_stock !== void 0;
  const availableStock = trackInventory ? Math.max(0, parseFloat(linkedProduct.current_stock || 0) - parseFloat(linkedProduct.reserved_stock || 0)) : null;
  const isOverStock = trackInventory && numericQty > availableStock;
  const validateForm = () => {
    if (!description.trim()) {
      setError("Item description is required");
      descRef.current?.focus();
      return false;
    }
    if (price === "" || isNaN(numericPrice) || numericPrice < 0) {
      setError("Please enter a valid price (\u2265 0)");
      priceRef.current?.focus();
      return false;
    }
    if (quantity === "" || isNaN(numericQty) || numericQty <= 0) {
      setError("Please enter a valid quantity (> 0)");
      qtyRef.current?.focus();
      return false;
    }
    if (linkToStock && !linkedProduct) {
      setError('Please select an inventory product to link, or uncheck "Link to Inventory Product"');
      stockSearchRef.current?.focus();
      return false;
    }
    if (isOverStock) {
      setError(`Quantity (${numericQty}) exceeds available stock (${availableStock} ${linkedProduct.unit || "pcs"})`);
      qtyRef.current?.focus();
      return false;
    }
    return true;
  };
  const handleConfirm = () => {
    if (!validateForm()) return;
    onConfirm({
      name: description.trim(),
      price: numericPrice,
      quantity: numericQty,
      unit: unit.trim() || (linkedProduct?.unit || "pcs"),
      gst_rate: effectiveGstRate,
      is_tax_exempt: isTaxExempt || effectiveGstRate === 0,
      hsn_code: hsnCode.trim() || (linkedProduct?.hsn_code || null),
      discount_amount: discountAmount,
      discount_type: discountType,
      discount_value: numericDiscount,
      linked_product: linkToStock ? linkedProduct : null,
      total_price: finalLineTotal
    });
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleConfirm();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      const active = document.activeElement;
      if (active === descRef.current) {
        e.preventDefault();
        priceRef.current?.focus();
        priceRef.current?.select();
      } else if (active === priceRef.current) {
        e.preventDefault();
        qtyRef.current?.focus();
        qtyRef.current?.select();
      } else if (active === qtyRef.current) {
        if (description.trim() && price !== "") {
          e.preventDefault();
          handleConfirm();
        }
      } else if (active === discRef.current) {
        e.preventDefault();
        handleConfirm();
      }
    }
  };
  const gstPresets = [0, 5, 12, 18, 28];
  return /* @__PURE__ */ React.createElement("div", { style: styles.overlay, onClick: onClose }, /* @__PURE__ */ React.createElement("div", { style: styles.modal, onClick: (e) => e.stopPropagation(), onKeyDown: handleKeyDown }, /* @__PURE__ */ React.createElement("div", { style: styles.header }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: styles.iconCircle }, /* @__PURE__ */ React.createElement(PackagePlus, { size: 20, color: "#F97316" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: styles.title }, initialItem ? "Edit Open / Custom Item" : "Add Open / Custom Item"), /* @__PURE__ */ React.createElement("p", { style: styles.subTitle }, "Directly bill ad-hoc items, custom services, or uncatalogued products (F1 / Ctrl+O)"))), /* @__PURE__ */ React.createElement("button", { style: styles.closeBtn, onClick: onClose, title: "Close (Esc)" }, /* @__PURE__ */ React.createElement(X, { size: 18 }))), error && /* @__PURE__ */ React.createElement("div", { style: styles.errorBox }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 15, color: "#EF4444", style: { flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", null, error)), /* @__PURE__ */ React.createElement("div", { style: styles.formBody }, /* @__PURE__ */ React.createElement("div", { style: styles.formGroup }, /* @__PURE__ */ React.createElement("label", { style: styles.label }, "Item Description / Name ", /* @__PURE__ */ React.createElement("span", { style: { color: "#EF4444" } }, "*"), ":"), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: descRef,
      type: "text",
      placeholder: "e.g. Custom Service, Gift Wrapping, Repair Labor...",
      value: description,
      onChange: (e) => {
        setDescription(e.target.value);
        if (error) setError("");
      },
      style: styles.textInput,
      autoFocus: true
    }
  )), /* @__PURE__ */ React.createElement("div", { style: styles.twoColRow }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { style: styles.label }, "Unit Price (\u20B9) ", /* @__PURE__ */ React.createElement("span", { style: { color: "#EF4444" } }, "*"), ":"), /* @__PURE__ */ React.createElement("div", { style: styles.inputWithBadge }, /* @__PURE__ */ React.createElement("span", { style: styles.leftBadge }, "\u20B9"), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: priceRef,
      type: "number",
      min: "0",
      step: "0.01",
      placeholder: "0.00",
      value: price,
      onChange: (e) => {
        setPrice(sanitizePositiveNumberString(e.target.value, true));
        if (error) setError("");
      },
      onFocus: handleSelectAllOnFocus,
      onClick: handleSelectAllOnClick,
      onMouseUp: handleSelectAllOnMouseUp,
      style: styles.numberInput
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { style: styles.label }, "Quantity ", /* @__PURE__ */ React.createElement("span", { style: { color: "#EF4444" } }, "*"), ":"), /* @__PURE__ */ React.createElement("div", { style: styles.inputWithBadge }, /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: qtyRef,
      type: "number",
      min: "0.001",
      step: "any",
      placeholder: "1",
      value: quantity,
      onChange: (e) => {
        setQuantity(sanitizePositiveNumberString(e.target.value, true));
        if (error) setError("");
      },
      onFocus: handleSelectAllOnFocus,
      onClick: handleSelectAllOnClick,
      onMouseUp: handleSelectAllOnMouseUp,
      style: styles.numberInput
    }
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: unit,
      onChange: (e) => setUnit(e.target.value),
      style: styles.unitSelect,
      tabIndex: -1
    },
    /* @__PURE__ */ React.createElement("option", { value: "pcs" }, "PCS"),
    /* @__PURE__ */ React.createElement("option", { value: "nos" }, "NOS"),
    /* @__PURE__ */ React.createElement("option", { value: "unit" }, "UNIT"),
    /* @__PURE__ */ React.createElement("option", { value: "kg" }, "KG"),
    /* @__PURE__ */ React.createElement("option", { value: "gm" }, "GM"),
    /* @__PURE__ */ React.createElement("option", { value: "mtr" }, "MTR"),
    /* @__PURE__ */ React.createElement("option", { value: "box" }, "BOX"),
    /* @__PURE__ */ React.createElement("option", { value: "set" }, "SET"),
    /* @__PURE__ */ React.createElement("option", { value: "hrs" }, "HRS")
  )))), /* @__PURE__ */ React.createElement("div", { style: styles.formGroup }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("label", { style: styles.label }, "Tax / GST Rate:"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#94A3B8" } }, "Mode: ", /* @__PURE__ */ React.createElement("strong", null, gstMode.toUpperCase()))), /* @__PURE__ */ React.createElement("div", { style: styles.presetGrid }, gstPresets.map((rate) => {
    const isActive = !isTaxExempt && selectedGstRate === rate;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: rate,
        type: "button",
        style: {
          ...styles.presetBtn,
          ...isActive ? styles.presetActive : {}
        },
        onClick: () => {
          setSelectedGstRate(rate);
          setIsTaxExempt(rate === 0);
        }
      },
      rate === 0 ? "0% (Exempt)" : `${rate}%`
    );
  }), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: {
        ...styles.presetBtn,
        ...selectedGstRate === -1 ? styles.presetActive : {}
      },
      onClick: () => {
        setSelectedGstRate(-1);
        setIsTaxExempt(false);
      }
    },
    "Custom %"
  )), selectedGstRate === -1 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "0",
      max: "100",
      step: "0.01",
      placeholder: "Enter GST %",
      value: customGstRate,
      onChange: (e) => setCustomGstRate(sanitizePositiveNumberString(e.target.value, true)),
      style: { ...styles.textInput, maxWidth: "140px" }
    }
  ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#94A3B8" } }, "% GST rate")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#94A3B8" } }, /* @__PURE__ */ React.createElement(Hash, { size: 13 }), /* @__PURE__ */ React.createElement("span", null, "HSN / SAC:")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "e.g. 9983 (Optional)",
      value: hsnCode,
      onChange: (e) => setHsnCode(e.target.value),
      style: { ...styles.textInput, maxWidth: "180px", padding: "6px 10px", fontSize: "12px" }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: styles.formGroup }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("label", { style: styles.label }, "Item Discount (Optional):"), discountAmount > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#10B981", fontWeight: "700" } }, "Discount: -\u20B9", discountAmount.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #334155" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: {
        ...styles.typeBtn,
        backgroundColor: discountType === "amount" ? "#F97316" : "#0F172A",
        color: discountType === "amount" ? "#FFFFFF" : "#94A3B8"
      },
      onClick: () => setDiscountType("amount")
    },
    "\u20B9 Flat"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: {
        ...styles.typeBtn,
        backgroundColor: discountType === "percentage" ? "#F97316" : "#0F172A",
        color: discountType === "percentage" ? "#FFFFFF" : "#94A3B8"
      },
      onClick: () => setDiscountType("percentage")
    },
    "% Pct"
  )), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: discRef,
      type: "number",
      min: "0",
      step: "0.01",
      placeholder: discountType === "percentage" ? "0%" : "\u20B90.00",
      value: discountValue,
      onChange: (e) => setDiscountValue(sanitizePositiveNumberString(e.target.value, true)),
      onFocus: handleSelectAllOnFocus,
      onClick: handleSelectAllOnClick,
      onMouseUp: handleSelectAllOnMouseUp,
      style: { ...styles.textInput, flex: 1 }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: styles.stockLinkSection }, /* @__PURE__ */ React.createElement("label", { style: styles.checkboxLabel }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: linkToStock,
      onChange: (e) => {
        setLinkToStock(e.target.checked);
        if (!e.target.checked) {
          setLinkedProduct(null);
          setShowStockDropdown(false);
        } else {
          setShowStockDropdown(true);
        }
      },
      style: { width: "16px", height: "16px", accentColor: "#F97316", cursor: "pointer" }
    }
  ), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "700", fontSize: "13px", color: "#F8FAFC" } }, "Link to Inventory Product (Deduct Stock on Sale)")), !linkToStock ? /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0 22px", fontSize: "11px", color: "#64748B" } }, "Unlinked: Pure custom item / service. No inventory stock will be impacted.") : /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", paddingLeft: "22px" } }, linkedProduct ? /* @__PURE__ */ React.createElement("div", { style: styles.selectedProductCard }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "800", color: "#38BDF8", fontSize: "13px" } }, linkedProduct.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#94A3B8" } }, "SKU: ", linkedProduct.sku || "N/A", " \u2022 Available Stock:", " ", /* @__PURE__ */ React.createElement("strong", { style: { color: availableStock <= 0 ? "#EF4444" : "#10B981" } }, availableStock !== null ? `${availableStock} ${linkedProduct.unit || "pcs"}` : "Not Tracked"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: styles.changeProductBtn,
      onClick: () => {
        setLinkedProduct(null);
        setShowStockDropdown(true);
      }
    },
    "Change"
  )) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: stockSearchRef,
      type: "text",
      placeholder: "Search product to deduct stock from...",
      value: stockSearchTerm,
      onChange: (e) => {
        setStockSearchTerm(e.target.value);
        setShowStockDropdown(true);
      },
      onFocus: () => setShowStockDropdown(true),
      style: styles.textInput
    }
  ), /* @__PURE__ */ React.createElement(Search, { size: 14, color: "#94A3B8", style: { position: "absolute", right: "12px", top: "12px" } })), showStockDropdown && /* @__PURE__ */ React.createElement("div", { style: styles.dropdownList }, filteredStockProducts.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { padding: "10px", fontSize: "12px", color: "#94A3B8", textAlign: "center" } }, "No matching products found") : filteredStockProducts.map((p) => {
    const pStock = p.current_stock !== null && p.current_stock !== void 0 ? Math.max(0, parseFloat(p.current_stock || 0) - parseFloat(p.reserved_stock || 0)) : null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: p.id || p.menu_item_id,
        style: styles.dropdownItem,
        onClick: () => {
          setLinkedProduct(p);
          setShowStockDropdown(false);
          if (!unit || unit === "pcs") {
            setUnit(p.unit || p.base_unit || "pcs");
          }
          if (!hsnCode && p.hsn_code) {
            setHsnCode(p.hsn_code);
          }
        }
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "700", color: "#F8FAFC", fontSize: "12px" } }, p.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#94A3B8" } }, "SKU: ", p.sku || "N/A", " \u2022 Price: \u20B9", parseFloat(p.price || 0).toFixed(2))),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: pStock <= 0 ? "#EF4444" : "#10B981" } }, pStock !== null ? `${pStock} ${p.unit || "pcs"}` : "Untracked")
    );
  }))))), /* @__PURE__ */ React.createElement("div", { style: styles.summaryCard }, /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: styles.summaryLabel }, "Gross Subtotal:"), /* @__PURE__ */ React.createElement("span", { style: styles.summaryVal }, "\u20B9", grossAmount.toFixed(2))), discountAmount > 0 && /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: { ...styles.summaryLabel, color: "#F59E0B" } }, "Item Discount:"), /* @__PURE__ */ React.createElement("span", { style: { ...styles.summaryVal, color: "#F59E0B" } }, "-\u20B9", discountAmount.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: styles.summaryLabel }, "Taxable Amount:"), /* @__PURE__ */ React.createElement("span", { style: styles.summaryVal }, "\u20B9", taxableAmount.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: styles.summaryRow }, /* @__PURE__ */ React.createElement("span", { style: styles.summaryLabel }, "GST (", effectiveGstRate, "%):"), /* @__PURE__ */ React.createElement("span", { style: styles.summaryVal }, "\u20B9", taxAmount.toFixed(2), " ", gstMode === "included" ? "(Inc)" : "(Add)")), /* @__PURE__ */ React.createElement("div", { style: styles.divider }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: styles.totalLabel }, "NET LINE TOTAL:"), /* @__PURE__ */ React.createElement("span", { style: styles.totalValue }, "\u20B9", finalLineTotal.toFixed(2))))), /* @__PURE__ */ React.createElement("div", { style: styles.actionRow }, /* @__PURE__ */ React.createElement("button", { type: "button", style: styles.cancelBtn, onClick: onClose }, "Cancel (Esc)"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: styles.confirmBtn,
      onClick: handleConfirm
    },
    /* @__PURE__ */ React.createElement(Check, { size: 16 }),
    /* @__PURE__ */ React.createElement("span", null, initialItem ? "Update Item (Enter)" : "Add to Cart (Enter)", " \u2022 \u20B9", finalLineTotal.toFixed(2))
  ))));
}
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
    backdropFilter: "blur(3px)"
  },
  modal: {
    backgroundColor: "#1E293B",
    borderRadius: "16px",
    width: "520px",
    maxWidth: "95vw",
    maxHeight: "92vh",
    overflowY: "auto",
    padding: "20px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    border: "1px solid #334155",
    color: "#F8FAFC"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "14px",
    borderBottom: "1px solid #334155",
    paddingBottom: "12px"
  },
  iconCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
    color: "#F8FAFC",
    lineHeight: 1.2
  },
  subTitle: {
    margin: "3px 0 0 0",
    fontSize: "11.5px",
    color: "#94A3B8"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94A3B8",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "6px"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#F87171",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    marginBottom: "12px"
  },
  formBody: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column"
  },
  twoColRow: {
    display: "flex",
    gap: "12px"
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#CBD5E1",
    marginBottom: "5px"
  },
  textInput: {
    width: "100%",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "9px 12px",
    fontSize: "13px",
    color: "#F8FAFC",
    outline: "none",
    boxSizing: "border-box"
  },
  inputWithBadge: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    overflow: "hidden"
  },
  leftBadge: {
    padding: "0 10px",
    fontSize: "13px",
    fontWeight: "800",
    color: "#F97316"
  },
  numberInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    padding: "9px 10px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#F8FAFC",
    outline: "none",
    boxSizing: "border-box"
  },
  unitSelect: {
    backgroundColor: "#1E293B",
    border: "none",
    borderLeft: "1px solid #334155",
    color: "#38BDF8",
    padding: "0 8px",
    height: "36px",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
    outline: "none"
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "6px"
  },
  presetBtn: {
    padding: "6px 4px",
    borderRadius: "6px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    color: "#CBD5E1",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
    textAlign: "center"
  },
  presetActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
    color: "#FFFFFF"
  },
  typeBtn: {
    padding: "6px 12px",
    border: "none",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer"
  },
  stockLinkSection: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    border: "1px dashed #334155",
    borderRadius: "10px",
    padding: "10px 12px"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none"
  },
  selectedProductCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    border: "1px solid #38BDF8",
    borderRadius: "8px",
    padding: "8px 12px"
  },
  changeProductBtn: {
    backgroundColor: "#334155",
    border: "none",
    color: "#F8FAFC",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer"
  },
  dropdownList: {
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "8px",
    maxHeight: "140px",
    overflowY: "auto",
    marginTop: "4px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
  },
  dropdownItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "1px solid #1E293B",
    cursor: "pointer"
  },
  summaryCard: {
    backgroundColor: "#0F172A",
    borderRadius: "10px",
    padding: "12px",
    border: "1px solid #334155"
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginBottom: "4px"
  },
  summaryLabel: {
    color: "#94A3B8"
  },
  summaryVal: {
    fontWeight: "700",
    color: "#F8FAFC"
  },
  divider: {
    height: "1px",
    backgroundColor: "#334155",
    margin: "8px 0"
  },
  totalLabel: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#CBD5E1"
  },
  totalValue: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#10B981"
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid #334155"
  },
  cancelBtn: {
    padding: "9px 16px",
    backgroundColor: "#334155",
    color: "#CBD5E1",
    border: "none",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer"
  },
  confirmBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 18px",
    backgroundColor: "#F97316",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(249, 115, 22, 0.3)"
  }
};
