"use client";
import { useState } from "react";
import { AppData } from "@/hooks/useData";
import { Product } from "@/types";
import ProductModal from "./ProductModal";

interface Props {
  data: AppData;
  isViewer?: boolean;
  onSaveProduct: (p: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export default function ProductsView({ data, isViewer, onSaveProduct, onDeleteProduct }: Props) {
  const { products } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filtered = products
    .filter(p => filterCat === "All" || p.category === filterCat)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <section>
      <div className="toolbar">
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk / solusi…" />
        <select className="search" style={{ flex: "none", width: "auto" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c === "All" ? "Semua kategori" : c}</option>)}
        </select>
        {!isViewer && <button className="btn" onClick={() => { setEditProduct(null); setModalOpen(true); }}>+ Produk Baru</button>}
      </div>

      {!filtered.length ? (
        <div className="panel"><div className="empty-state">Belum ada produk di catalog.</div></div>
      ) : (
        <div className="catalog-grid">
          {filtered.map(p => (
            <div key={p.id} className="catalog-card">
              <div className="catalog-cat">{p.category}</div>
              <div className="catalog-name">{p.name}</div>
              {p.description && <div className="catalog-desc">{p.description}</div>}
              {!isViewer && <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => { setEditProduct(p); setModalOpen(true); }}>Edit</button>}
            </div>
          ))}
        </div>
      )}

      <ProductModal open={modalOpen} product={editProduct}
        onSave={onSaveProduct} onDelete={onDeleteProduct} onClose={() => setModalOpen(false)} />
    </section>
  );
}
