import React, { useState, useEffect } from 'react';
import { 
  Search, Menu, X, Plus, Trash2, Edit2, LogOut, Lock, ChevronRight, 
  Image as ImageIcon, Layers, Palette, FileText, Camera, Ruler
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// PREENCHA AQUI COM SEUS DADOS DO SUPABASE (Settings > API)
const supabaseUrl = 'https://xgoiksheloyxvrojmacv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb2lrc2hlbG95eHZyb2ptYWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDAyODQsImV4cCI6MjA3OTI3NjI4NH0.97qYjt1n0SIUbAwX1BJ7NSe04ZCJcEIrm5PSp-69fyM';

const supabase = createClient(supabaseUrl, supabaseKey);

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000; 
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false); 
  const [view, setView] = useState('home');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  useEffect(() => {
    fetchProducts();
    const channel = supabase
      .channel('table-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        fetchProducts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) console.error('Erro ao buscar:', error);
    else {
      setProducts(data || []);
      const cats = [...new Set((data || []).map(p => p.category))].filter(Boolean);
      setCategories(cats.sort());
    }
  }

  const handleLogin = (email, password) => {
    if (email === 'gustavo_benvindo80@hotmail.com' && password === 'Gustavor80') {
      setIsAdmin(true);
      setView('admin-dashboard');
    } else {
      alert('Credenciais inválidas');
    }
  };

  const handleSaveProduct = async (productData) => {
    const payload = {
      name: productData.name,
      category: productData.category,
      composition: productData.composition || '',
      tech_composition: productData.techComposition || '',
      images: productData.images || [],
      variants: productData.variants || []
    };

    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }
      setView('admin-dashboard');
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Verifique tabela Supabase.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Tem certeza?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Erro ao deletar');
    else fetchProducts();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="font-bold text-xl cursor-pointer flex items-center gap-2" onClick={() => setView('home')}>
             <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded">K</div>
             <span>Kavin's Fashion</span>
          </div>
          <div>
             {isAdmin ? (
               <div className="flex gap-2">
                 <button onClick={() => setView('admin-dashboard')} className="text-sm font-medium px-3">Dashboard</button>
                 <button onClick={() => {setEditingProduct(null); setView('product-form')}} className="bg-black text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"><Plus size={14}/> Novo</button>
                 <button onClick={() => {setIsAdmin(false); setView('home')}} className="text-gray-500 px-2"><LogOut size={16}/></button>
               </div>
             ) : (
               <button onClick={() => setView('admin-login')} className="text-sm text-gray-500 flex items-center gap-1"><Lock size={14} /> Admin</button>
             )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'home' && <CatalogView products={products} categories={categories} onSelect={(p) => { setSelectedProduct(p); setView('product-detail'); }} />}
        {view === 'product-detail' && selectedProduct && <ProductDetailView product={selectedProduct} onBack={() => setView('home')} isAdmin={isAdmin} onEdit={() => {setEditingProduct(selectedProduct); setView('product-form')}} />}
        {view === 'admin-login' && <LoginView onLogin={handleLogin} onBack={() => setView('home')} />}
        {view === 'admin-dashboard' && <AdminDashboard products={products} onEdit={(p) => {setEditingProduct(p); setView('product-form')}} onDelete={handleDeleteProduct} />}
        {view === 'product-form' && <ProductForm existingProduct={editingProduct} categories={categories} onSave={handleSaveProduct} onCancel={() => setView('admin-dashboard')} />}
      </main>
    </div>
  );
}

function CatalogView({ products, categories, onSelect }) {
  const [cat, setCat] = useState('Todos');
  const filtered = products.filter(p => cat === 'Todos' || p.category === cat);
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-light">Coleção 2026</h1>
        <p className="text-gray-500">Catálogo Digital</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setCat('Todos')} className={`px-4 py-1 rounded-full text-sm ${cat === 'Todos' ? 'bg-black text-white' : 'bg-white border'}`}>Todos</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-1 rounded-full text-sm ${cat === c ? 'bg-black text-white' : 'bg-white border'}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map(p => (
          <div key={p.id} onClick={() => onSelect(p)} className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer group hover:shadow-md transition-all">
            <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
              {p.images?.[0] ? (
                 <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (<div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon/></div>)}
              <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">{p.category}</div>
            </div>
            <div className="p-4">
              <h3 className="font-medium truncate">{p.name}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {p.variants?.[0] ? `REF: ${p.variants[0].ref}` : 'S/ REF'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetailView({ product, onBack, isAdmin, onEdit }) {
  const [img, setImg] = useState(product.images?.[0]);
  const [vIdx, setVIdx] = useState(0);
  const vars = product.variants || [];
  const curVar = vars[vIdx] || { name: 'Padrão', colors: [] };

  return (
    <div className="flex flex-col lg:flex-row gap-8 bg-white p-4 lg:p-8 rounded-xl min-h-[80vh]">
      <div className="w-full lg:w-3/5 flex flex-col gap-4">
        <button onClick={onBack} className="flex items-center text-gray-500"><ChevronRight className="rotate-180" size={16}/> Voltar</button>
        <div className="aspect-[3/4] lg:aspect-auto lg:h-[600px] bg-gray-50 rounded-lg overflow-hidden">
          {img && <img src={img} className="w-full h-full object-contain" />}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {product.images?.map((src, i) => (
             <img key={i} src={src} onClick={() => setImg(src)} className={`w-20 h-24 object-cover cursor-pointer border rounded ${img === src ? 'border-black' : 'border-transparent'}`} />
          ))}
        </div>
      </div>
      <div className="w-full lg:w-2/5 space-y-8">
        {isAdmin && <button onClick={onEdit} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Editar Produto</button>}
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase">{product.category}</span>
          <h1 className="text-4xl font-serif mt-1">{product.name}</h1>
        </div>
        {vars.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2"><Ruler size={14}/> Grade de Tamanho</h3>
            <div className="flex gap-2 flex-wrap mb-4">
              {vars.map((v, i) => (
                <button key={i} onClick={() => setVIdx(i)} className={`px-4 py-2 text-sm border rounded-md transition-colors ${vIdx === i ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}>{v.name}</button>
              ))}
            </div>
            <p className="text-sm font-mono text-gray-600 border-t border-gray-200 pt-2">REF: <span className="font-bold text-black">{curVar.ref}</span></p>
          </div>
        )}
        <div>
          <h3 className="font-bold text-sm uppercase mb-3 flex items-center gap-2"><Palette size={14}/> Cores Disponíveis</h3>
          <div className="flex flex-col gap-2">
            {curVar.colors?.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border border-gray-100 rounded hover:bg-gray-50">
                <div className="w-6 h-6 rounded-full border shadow-sm" style={{backgroundColor: c.hex}}></div>
                <span className="text-sm font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-6 border-t space-y-4">
          <div><h3 className="font-bold text-xs uppercase text-gray-500 mb-1">Composição</h3><p className="text-gray-900">{product.composition}</p></div>
          {product.tech_composition && <div><h3 className="font-bold text-xs uppercase text-gray-500 mb-1">Ficha Técnica</h3><p className="text-gray-600 text-sm font-mono">{product.tech_composition}</p></div>}
        </div>
      </div>
    </div>
  );
}

function LoginView({ onLogin, onBack }) {
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-center">Acesso Restrito</h2>
      <div className="space-y-4">
        <input className="w-full border p-3 rounded-lg outline-none focus:border-black" placeholder="Email" value={e} onChange={ev => setE(ev.target.value)} />
        <input className="w-full border p-3 rounded-lg outline-none focus:border-black" type="password" placeholder="Senha" value={p} onChange={ev => setP(ev.target.value)} />
        <button onClick={() => onLogin(e, p)} className="w-full bg-black text-white py-3 rounded-lg font-bold">Entrar</button>
        <button onClick={onBack} className="w-full text-sm text-gray-500 py-2">Voltar</button>
      </div>
    </div>
    </div>
  );
}

function AdminDashboard({ products, onEdit, onDelete }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Produtos ({products.length})</h2>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Produto</th><th className="p-4 text-right">Ações</th></tr></thead>
          <tbody className="divide-y">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 flex items-center gap-3">
                   <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">{p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover"/>}</div>
                   <div><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.category}</div></div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductForm({ existingProduct, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', category: '', composition: '', techComposition: '', images: [], variants: [] });
  const [vForm, setVForm] = useState({ name: 'P ao G', ref: '', colors: [], newCN: '', newCH: '#000000' });
  const [newImg, setNewImg] = useState('');
  
  useEffect(() => { 
    if (existingProduct) {
      setForm({
        ...existingProduct,
        techComposition: existingProduct.tech_composition || existingProduct.techComposition
      }); 
    }
  }, [existingProduct]);

  const addVar = () => {
    if (!vForm.name || !vForm.ref) return alert('Preencha nome e ref da grade');
    setForm(p => ({...p, variants: [...p.variants, {name: vForm.name, ref: vForm.ref, colors: vForm.colors}]}));
    setVForm(p => ({...p, ref: '', colors: []}));
  };

  const addColorToVar = () => {
    if(!vForm.newCN) return;
    setVForm(p => ({...p, colors: [...p.colors, {name: p.newCN, hex: p.newCH}], newCN: ''}));
  };

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      const res = await compressImage(f);
      setForm(p => ({...p, images: [...p.images, res]}));
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border animate-in zoom-in-95">
      <div className="flex justify-between mb-6 border-b pb-4">
         <h2 className="font-bold text-xl">{existingProduct ? 'Editar' : 'Novo Produto'}</h2>
         <button onClick={onCancel}><X /></button>
      </div>
      <div className="space-y-6">
        <input className="w-full border p-3 rounded-lg" placeholder="Nome do Produto" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border p-3 rounded-lg" placeholder="Categoria (ex: Calça)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          <input className="border p-3 rounded-lg" placeholder="Composição" value={form.composition} onChange={e => setForm({...form, composition: e.target.value})} />
        </div>
        <input className="w-full border p-3 rounded-lg" placeholder="Ficha Técnica" value={form.techComposition} onChange={e => setForm({...form, techComposition: e.target.value})} />

        <div className="bg-gray-50 p-5 rounded-xl border">
          <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2"><Ruler size={14}/> Grades de Tamanho</h3>
          {form.variants.map((v, i) => (
             <div key={i} className="bg-white p-3 mb-2 border rounded flex justify-between items-center shadow-sm">
               <div><span className="font-bold">{v.name}</span> <span className="text-gray-500 text-sm">({v.ref})</span><div className="flex gap-1 mt-1">{v.colors.map((c,ci) => <div key={ci} className="w-3 h-3 rounded-full" style={{backgroundColor:c.hex}}/>)}</div></div>
               <button onClick={() => setForm(p => ({...p, variants: p.variants.filter((_, idx) => idx !== i)}))} className="text-red-500 p-2"><Trash2 size={14}/></button>
             </div>
          ))}
          <div className="mt-4 pt-4 border-t border-gray-200">
             <div className="flex gap-2 mb-2">
               <input placeholder="Nome (ex: P ao G)" className="border p-2 rounded w-1/2 text-sm" value={vForm.name} onChange={e => setVForm({...vForm, name: e.target.value})} />
               <input placeholder="Referência" className="border p-2 rounded w-1/2 text-sm font-mono" value={vForm.ref} onChange={e => setVForm({...vForm, ref: e.target.value})} />
             </div>
             <div className="flex gap-2 mb-2 items-center">
                <input placeholder="Nome Cor" className="border p-2 rounded text-sm flex-1" value={vForm.newCN} onChange={e => setVForm({...vForm, newCN: e.target.value})} />
                <input type="color" className="h-9 w-9 rounded cursor-pointer" value={vForm.newCH} onChange={e => setVForm({...vForm, newCH: e.target.value})} />
                <button onClick={addColorToVar} className="bg-gray-200 px-3 py-2 rounded text-xs font-bold hover:bg-gray-300">+ ADD</button>
             </div>
             <div className="flex gap-1 mb-3 flex-wrap">{vForm.colors.map((c,i)=>(<span key={i} className="text-xs bg-white border px-2 py-1 rounded-full flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:c.hex}}/> {c.name}</span>))}</div>
             <button onClick={addVar} className="bg-black text-white w-full py-2 rounded font-medium text-sm hover:bg-gray-800">Salvar Grade</button>
          </div>
        </div>

        <div className="border p-5 rounded-xl">
           <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2"><ImageIcon size={14}/> Galeria</h3>
           <div className="grid grid-cols-4 gap-3 mb-4">
             {form.images.map((img, i) => (
               <div key={i} className="relative aspect-[3/4] group">
                 <img src={img} className="w-full h-full object-cover rounded-lg border" />
                 <button onClick={() => setForm(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 bg-white text-red-600 p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
               </div>
             ))}
           </div>
           <div className="flex gap-2">
              <label className="flex-1 bg-blue-600 text-white py-2 rounded text-center cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><Plus size={16}/> Upload Fotos<input type="file" multiple accept="image/*" onChange={handleFile} className="hidden" /></label>
           </div>
           <div className="flex gap-2 mt-2">
             <input className="border p-2 rounded flex-1 text-sm" placeholder="Ou cole URL da imagem" value={newImg} onChange={e => setNewImg(e.target.value)} />
             <button onClick={() => {if(newImg) setForm(p=>({...p, images: [...p.images, newImg]})); setNewImg('')}} className="bg-gray-100 px-4 rounded text-sm">Add</button>
           </div>
        </div>

        <div className="flex gap-3 pt-4">
           <button onClick={onCancel} className="flex-1 border py-3 rounded-lg font-medium hover:bg-gray-50">Cancelar</button>
           <button onClick={() => onSave(form)} className="flex-1 bg-black text-white py-3 rounded-lg font-bold shadow-lg hover:bg-gray-800">Salvar Tudo</button>
        </div>
      </div>
    </div>
  );
}
