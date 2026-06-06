'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const CATEGORIES = [
  'BEER',
  'BRANDY',
  'GIN',
  'RUM',
  'SODA',
  'VODKA',
  'WATER',
  'WHISKY',
  'WHITE RUM',
  'WINE'
];

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    category_name: 'BEER',
    product_code: '',
    product_name: '',
    product_alias: '',
    manufacturer_name: '',
    ml_per_bottle: '',
    bottles_per_case: '',
    rate_per_bottle: '',
    product_description: '',
    product_status: 'ACTIVE'
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.status === 'success') {
        const sorted = data.data.sort((a: any, b: any) => {
          const catCompare = a.category_name.localeCompare(b.category_name);
          if (catCompare !== 0) return catCompare;
          return a.product_alias.localeCompare(b.product_alias);
        });
        setProducts(sorted);
        setFilteredProducts(sorted);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.product_alias.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleCreateClick = () => {
    setModalMode('create');
    setEditingProduct(null);
    setFormData({
      category_name: 'BEER',
      product_code: '',
      product_name: '',
      product_alias: '',
      manufacturer_name: '',
      ml_per_bottle: '',
      bottles_per_case: '',
      rate_per_bottle: '',
      product_description: '',
      product_status: 'ACTIVE'
    });
    setShowModal(true);
  };

  const handleEditClick = (product: any) => {
    setModalMode('edit');
    setEditingProduct(product);
    setFormData({
      category_name: product.category_name,
      product_code: product.product_code || '',
      product_name: product.product_name,
      product_alias: product.product_alias,
      manufacturer_name: product.manufacturer_name || '',
      ml_per_bottle: product.ml_per_bottle.toString(),
      bottles_per_case: product.bottles_per_case.toString(),
      rate_per_bottle: (product.purchase_rate_per_ml * product.ml_per_bottle).toString(),
      product_description: product.product_description || '',
      product_status: product.product_status
    });
    setShowModal(true);
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    let newValue = value;

    if (e.target.type !== 'select-one') {
      newValue = value.toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = modalMode === 'create'
        ? `${process.env.NEXT_PUBLIC_API_URL}/products`
        : `${process.env.NEXT_PUBLIC_API_URL}/products/${editingProduct.product_id}`;

      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ml_per_bottle: parseInt(formData.ml_per_bottle),
          bottles_per_case: parseInt(formData.bottles_per_case),
          rate_per_bottle: parseFloat(formData.rate_per_bottle),
          created_by: user?.id || user?.auth_id
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setShowModal(false);
        fetchProducts();
        alert(modalMode === 'create' ? 'Product created successfully!' : 'Product updated successfully!');
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout user={user}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>PRODUCT PROFILE</h1>
        </div>

        <div style={styles.contentCard}>
          <div style={styles.toolbar}>
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="SEARCH BY CATEGORY, NAME, OR ALIAS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <button onClick={handleSearch} style={styles.searchBtn} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}>
                SEARCH
              </button>
            </div>

            <button onClick={handleCreateClick} style={styles.createBtn} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}>
              + CREATE NEW PRODUCT
            </button>
          </div>

          {loading ? (
            <div style={styles.loadingText}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={styles.emptyText}>NO PRODUCTS FOUND</div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>CATEGORY</th>
                    <th style={styles.th}>PRODUCT ALIAS</th>
                    <th style={styles.th}>DESCRIPTION</th>
                    <th style={styles.th}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id} style={styles.tableRow} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      <td style={styles.td}>{product.category_name}</td>
                      <td style={styles.td}>{product.product_alias}</td>
                      <td style={styles.td}>{product.product_description || '-'}</td>
                      <td style={styles.td}>
                        <button onClick={() => handleEditClick(product)} style={styles.editBtn} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F57C00'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF9800'}>
                          EDIT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={styles.resultCount}>
            SHOWING {filteredProducts.length} OF {products.length} PRODUCTS
          </div>
        </div>

        {showModal && (
          <div style={styles.modalOverlay} onClick={() => !submitting && setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {modalMode === 'create' ? 'CREATE NEW PRODUCT' : 'EDIT PRODUCT'}
                </h2>
                <button onClick={() => !submitting && setShowModal(false)} style={styles.closeBtn}>✕</button>
              </div>

              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>CATEGORY NAME *</label>
                    <select name="category_name" value={formData.category_name} onChange={handleInputChange} required style={styles.input}>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>PRODUCT CODE</label>
                    <input type="text" name="product_code" value={formData.product_code} onChange={handleInputChange} style={styles.input} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>PRODUCT NAME *</label>
                    <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} required style={styles.input} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>PRODUCT ALIAS *</label>
                    <input type="text" name="product_alias" value={formData.product_alias} onChange={handleInputChange} required style={styles.input} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>MANUFACTURER NAME</label>
                    <input type="text" name="manufacturer_name" value={formData.manufacturer_name} onChange={handleInputChange} style={styles.input} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>ML PER BOTTLE *</label>
                    <input type="number" name="ml_per_bottle" value={formData.ml_per_bottle} onChange={handleInputChange} required style={styles.input} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>BOTTLES PER CASE *</label>
                    <input type="number" name="bottles_per_case" value={formData.bottles_per_case} onChange={handleInputChange} required style={styles.input} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>RATE PER BOTTLE *</label>
                    <input type="number" step="0.01" name="rate_per_bottle" value={formData.rate_per_bottle} onChange={handleInputChange} required style={styles.input} />
                  </div>

                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>PRODUCT DESCRIPTION</label>
                    <textarea name="product_description" value={formData.product_description} onChange={handleInputChange} style={{...styles.input, minHeight: '80px', fontFamily: '"Courier New", Courier, monospace'}} />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>STATUS *</label>
                    <select name="product_status" value={formData.product_status} onChange={handleInputChange} required style={styles.input}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                </div>

                <div style={styles.modalButtons}>
                  <button type="button" onClick={() => setShowModal(false)} disabled={submitting} style={styles.cancelBtn} onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#d0d0d0')} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}>
                    CANCEL
                  </button>
                  <button type="submit" disabled={submitting} style={styles.submitBtn} onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#1976D2')} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}>
                    {submitting ? 'SAVING...' : (modalMode === 'create' ? 'CREATE' : 'UPDATE')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    padding: 'clamp(20px, 4vw, 32px)',
  } as React.CSSProperties,

  pageHeader: {
    marginBottom: 'clamp(20px, 3vw, 28px)',
  } as React.CSSProperties,

  pageTitle: {
    fontSize: 'clamp(20px, 3.5vw, 28px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: 0,
  } as React.CSSProperties,

  contentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(20px, 3vw, 28px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  toolbar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'clamp(12px, 2vw, 16px)',
    marginBottom: 'clamp(20px, 3vw, 28px)',
    alignItems: 'end',
  } as React.CSSProperties,

  searchContainer: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 12px)',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.3vw, 13px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    transition: 'border-color 0.3s',
  } as React.CSSProperties,

  searchBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#1a1a1a',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  createBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  tableContainer: {
    overflowX: 'auto',
    marginBottom: 'clamp(16px, 2vw, 20px)',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,

  tableHeader: {
    backgroundColor: '#f8f8f8',
    borderBottom: '2px solid #e0e0e0',
  } as React.CSSProperties,

  th: {
    padding: 'clamp(12px, 2vw, 16px)',
    textAlign: 'left',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
  } as React.CSSProperties,

  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.2s',
    backgroundColor: '#ffffff',
  } as React.CSSProperties,

  td: {
    padding: 'clamp(12px, 2vw, 16px)',
    color: '#595959',
  } as React.CSSProperties,

  editBtn: {
    padding: 'clamp(6px, 1vw, 8px) clamp(12px, 1.5vw, 16px)',
    fontSize: 'clamp(10px, 1.1vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    color: '#ffffff',
    backgroundColor: '#FF9800',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  loadingText: {
    textAlign: 'center',
    padding: 'clamp(20px, 4vw, 32px)',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    color: '#8a8a8a',
  } as React.CSSProperties,

  emptyText: {
    textAlign: 'center',
    padding: 'clamp(20px, 4vw, 32px)',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    color: '#8a8a8a',
  } as React.CSSProperties,

  resultCount: {
    fontSize: 'clamp(10px, 1.1vw, 11px)',
    color: '#8a8a8a',
    letterSpacing: '0.5px',
    textAlign: 'right',
  } as React.CSSProperties,

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,

  modal: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    width: '600px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'clamp(16px, 2vw, 20px)',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f8f8f8',
  } as React.CSSProperties,

  modalTitle: {
    fontSize: 'clamp(16px, 2.5vw, 20px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: 0,
  } as React.CSSProperties,

  closeBtn: {
    fontSize: '20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#1a1a1a',
    fontWeight: 'bold',
  } as React.CSSProperties,

  form: {
    padding: 'clamp(16px, 2vw, 20px)',
  } as React.CSSProperties,

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'clamp(12px, 2vw, 16px)',
    marginBottom: 'clamp(16px, 2vw, 20px)',
  } as React.CSSProperties,

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,

  label: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  input: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    transition: 'border-color 0.3s',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  modalButtons: {
    display: 'flex',
    gap: 'clamp(8px, 2vw, 12px)',
    justifyContent: 'flex-end',
    paddingTop: 'clamp(12px, 2vw, 16px)',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,

  cancelBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  submitBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,
};