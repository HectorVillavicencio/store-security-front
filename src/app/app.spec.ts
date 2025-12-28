import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  // UI State
  menuAbierto = signal(false);
  vistaActual = signal<'productos' | 'categorias' | 'subcategorias' | 'ventas'>('productos');

  // Datos del Backend
  productos = signal<any[]>([]);
  categorias = signal<any[]>([]);
  subcategorias = signal<any[]>([]);

  // Formularios (Signals para enlazar con ngModel)
  formProducto = signal({ nombre: '', descripcion: '', precio: 0, stock: 0, subcategoriaId: 0 });
  formCategoria = signal({ nombre: '' });
  formSubCat = signal({ nombre: '', categoriaId: 0 });

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.http.get<any[]>(`${this.API_URL}/productos`).subscribe(res => this.productos.set(res));
    this.http.get<any[]>(`${this.API_URL}/categorias`).subscribe(res => this.categorias.set(res));
    this.http.get<any[]>(`${this.API_URL}/subcategorias`).subscribe(res => this.subcategorias.set(res));
  }

  toggleMenu() { this.menuAbierto.update(v => !v); }
  
  setVista(vista: any) {
    this.vistaActual.set(vista);
    this.menuAbierto.set(false);
  }

  // --- Acciones CRUD ---
  crearProducto() {
    this.http.post(`${this.API_URL}/productos`, this.formProducto()).subscribe({
      next: () => { this.cargarDatos(); alert('Producto Creado'); },
      error: (err) => alert("Error: " + err.error)
    });
  }

  eliminarProducto(id: number) {
    if (confirm('¿Eliminar?')) {
      this.http.delete(`${this.API_URL}/productos/${id}`).subscribe(() => this.cargarDatos());
    }
  }

  crearCategoria() {
    this.http.post(`${this.API_URL}/categorias`, this.formCategoria()).subscribe(() => this.cargarDatos());
  }
}