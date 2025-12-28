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

  // --- SEÑALES DE DATOS ---
  productos = signal<any[]>([]);
  categorias = signal<any[]>([]);
  subcategoriasTotales = signal<any[]>([]);

  // --- ESTADOS DE UI ---
  vistaActual = signal<'productos' | 'maestros'>('productos');
  modalProd = signal(false);
  modalCat = signal(false);
  modalSub = signal(false);
  esEdicion = signal(false);
  intentoSometido = signal(false);

  // --- FORMULARIOS ---
  formProd = signal<any>({ nombre: '', descripcion: '', precio: null, stock: null, categoriaId: null, categoriaNombre: '', subcategoriaId: null });
  formCat = signal({ nombre: '' });
  formSub = signal({ nombre: '', categoriaId: null });

  // --- LÓGICA FILTRADO PRODUCTOS ---
  subcategoriasFiltradas = computed(() => {
    const nomCat = this.formProd().categoriaNombre;
    return nomCat ? this.subcategoriasTotales().filter(s => s.categoriaPadre === nomCat) : [];
  });

  ngOnInit() { this.cargarTodo(); }

  cargarTodo() {
    this.http.get<any[]>(`${this.API}/productos`).subscribe(res => this.productos.set(res));
    this.http.get<any[]>(`${this.API}/categorias`).subscribe(res => this.categorias.set(res));
    this.http.get<any[]>(`${this.API}/subcategorias`).subscribe(res => this.subcategoriasTotales.set(res));
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
    const payload = { ...f, categoriaId: Number(f.categoriaId), subcategoriaId: f.subcategoriaId ? Number(f.subcategoriaId) : null };
    const req = this.esEdicion() ? this.http.put(`${this.API}/productos/${f.id}`, payload) : this.http.post(`${this.API}/productos`, payload);
    req.subscribe(() => { this.cargarTodo(); this.modalProd.set(false); });
  }

  eliminarProd(id: number) { if(confirm('¿Eliminar producto?')) this.http.delete(`${this.API}/productos/${id}`).subscribe(() => this.cargarTodo()); }

  // --- ACCIONES CATEGORÍAS Y SUBS ---
  guardarCat() {
    this.http.post(`${this.API}/categorias`, this.formCat()).subscribe(() => { this.cargarTodo(); this.modalCat.set(false); this.formCat.set({ nombre: '' }); });
  }

  guardarSub() {
    const s = this.formSub();
    const payload = { nombre: s.nombre, categoriaId: Number(s.categoriaId) };
    this.http.post(`${this.API}/subcategorias`, payload).subscribe(() => { this.cargarTodo(); this.modalSub.set(false); this.formSub.set({ nombre: '', categoriaId: null }); });
  }

  eliminarCat(id: number) { if(confirm('¿Eliminar categoría y sus dependencias?')) this.http.delete(`${this.API}/categorias/${id}`).subscribe(() => this.cargarTodo()); }
  eliminarSub(id: number) { if(confirm('¿Eliminar subcategoría?')) this.http.delete(`${this.API}/subcategorias/${id}`).subscribe(() => this.cargarTodo()); }
}