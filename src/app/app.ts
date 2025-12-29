import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private http = inject(HttpClient);
  private readonly API = 'http://localhost:8080/api';

  // --- DATOS CENTRALES ---
  productosRaw = signal<any[]>([]);
  categorias = signal<any[]>([]);
  subcategoriasTotales = signal<any[]>([]);
  tickets = signal<any[]>([]);

  // --- UI & NAVEGACIÓN ---
  vistaActual = signal<'productos' | 'maestros' | 'comprar' | 'ventas'>('productos');
  busqueda = signal('');
  columnaOrden = signal<string>('nombre');
  ordenAsc = signal(true);
  
  // Modales
  modalProd = signal(false);
  modalCat = signal(false);
  modalSub = signal(false);
  modalDetalleTicket = signal<any>(null);
  esEdicion = signal(false);

  // Formularios
  formProd = signal<any>({ nombre: '', descripcion: '', precio: null, stock: null, categoriaId: null, categoriaNombre: '', subcategoriaId: null });
  formCat = signal({ nombre: '' });
  formSub = signal({ nombre: '', categoriaId: null });

  // --- CARRITO ---
  carrito = signal<any[]>([]);
  totalCarrito = computed(() => this.carrito().reduce((acc, item) => acc + (item.precio * item.cantidad), 0));

  // --- LÓGICA COMPUTADA (FILTROS Y ORDEN) ---
  productos = computed(() => {
    let lista = this.productosRaw().filter(p => 
      p.nombre.toLowerCase().includes(this.busqueda().toLowerCase())
    );
    const col = this.columnaOrden();
    const dir = this.ordenAsc() ? 1 : -1;
    return lista.sort((a, b) => {
      let valA = a[col]; let valB = b[col];
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      return valA < valB ? -1 * dir : valA > valB ? 1 * dir : 0;
    });
  });

  productosParaVenta = computed(() => {
    return this.productosRaw().filter(p => p.stock > 0 && p.nombre.toLowerCase().includes(this.busqueda().toLowerCase()));
  });

  subcategoriasFiltradas = computed(() => {
    const nomCat = this.formProd().categoriaNombre;
    return nomCat ? this.subcategoriasTotales().filter(s => s.categoriaPadre === nomCat) : [];
  });

  ngOnInit() { this.cargarTodo(); }

  cargarTodo() {
    this.http.get<any[]>(`${this.API}/productos`).subscribe(res => this.productosRaw.set(res));
    this.http.get<any[]>(`${this.API}/categorias`).subscribe(res => this.categorias.set(res));
    this.http.get<any[]>(`${this.API}/subcategorias`).subscribe(res => this.subcategoriasTotales.set(res));
    this.http.get<any[]>(`${this.API}/tickets`).subscribe(res => this.tickets.set(res));
  }

  // --- GESTIÓN DE ORDEN ---
  ordenar(columna: string) {
    if (this.columnaOrden() === columna) { this.ordenAsc.update(v => !v); } 
    else { this.columnaOrden.set(columna); this.ordenAsc.set(true); }
  }

  // --- ACCIONES PRODUCTOS ---
  abrirCrearProd() {
    this.esEdicion.set(false);
    this.formProd.set({ nombre: '', descripcion: '', precio: null, stock: null, categoriaId: null, categoriaNombre: '', subcategoriaId: null });
    this.modalProd.set(true);
  }

  abrirEditarProd(p: any) {
    this.esEdicion.set(true);
    const sub = this.subcategoriasTotales().find(s => s.nombre === p.subcategoria);
    this.formProd.set({ ...p, categoriaId: p.categoriaId, categoriaNombre: p.categoria, subcategoriaId: sub ? sub.id : null });
    this.modalProd.set(true);
  }

  cambioCatProd(ev: any) {
    const id = ev.target.value;
    const cat = this.categorias().find(c => c.id == id);
    this.formProd.update(f => ({ ...f, categoriaId: id, categoriaNombre: cat?.nombre || '', subcategoriaId: null }));
  }

  guardarProd() {
    const f = this.formProd();
    if (f.precio <= 0 || f.stock <= 0) { alert("Precio y Stock deben ser mayores a 0"); return; }
    const payload = { ...f, categoriaId: Number(f.categoriaId), subcategoriaId: f.subcategoriaId ? Number(f.subcategoriaId) : null };
    const req = this.esEdicion() ? this.http.put(`${this.API}/productos/${f.id}`, payload) : this.http.post(`${this.API}/productos`, payload);
    req.subscribe(() => { this.cargarTodo(); this.modalProd.set(false); });
  }

  eliminarProd(id: number) { if(confirm('¿Borrar producto?')) this.http.delete(`${this.API}/productos/${id}`).subscribe(() => this.cargarTodo()); }

  // --- ACCIONES MAESTROS ---
  guardarCat() {
    this.http.post(`${this.API}/categorias`, this.formCat()).subscribe(() => { this.cargarTodo(); this.modalCat.set(false); this.formCat.set({ nombre: '' }); });
  }

  guardarSub() {
    const s = this.formSub();
    const payload = { nombre: s.nombre, categoriaId: Number(s.categoriaId) };
    this.http.post(`${this.API}/subcategorias`, payload).subscribe(() => { this.cargarTodo(); this.modalSub.set(false); this.formSub.set({ nombre: '', categoriaId: null }); });
  }

  eliminarCat(id: number) { if(confirm('¿Borrar categoría?')) this.http.delete(`${this.API}/categorias/${id}`).subscribe(() => this.cargarTodo()); }
  eliminarSub(id: number) { if(confirm('¿Borrar subcategoría?')) this.http.delete(`${this.API}/subcategorias/${id}`).subscribe(() => this.cargarTodo()); }

  // --- SISTEMA DE VENTAS ---
  agregarAlCarrito(p: any) {
    const item = this.carrito().find(i => i.productoId === p.id);
    if (item) {
      if (item.cantidad < p.stock) {
        this.carrito.update(cart => cart.map(i => i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      } else { alert("Stock insuficiente"); }
    } else {
      this.carrito.update(cart => [...cart, { productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }]);
    }
  }

  quitarDelCarrito(id: number) { this.carrito.update(cart => cart.filter(i => i.productoId !== id)); }

  finalizarVenta() {
    const pedido = { items: this.carrito().map(i => ({ productoId: i.productoId, cantidad: i.cantidad })) };
    this.http.post(`${this.API}/ventas/realizar`, pedido).subscribe({
      next: () => {
        alert("Venta exitosa");
        this.carrito.set([]);
        this.cargarTodo();
        this.vistaActual.set('ventas');
      },
      error: (e) => alert(e.error)
    });
  }
}