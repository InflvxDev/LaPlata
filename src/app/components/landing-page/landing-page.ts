import { Component, ViewEncapsulation, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css'],
  encapsulation: ViewEncapsulation.None
})
export class LandingPage implements OnInit, OnDestroy {
  private isBrowser: boolean;
  
  // FAQ data
  faqs = [
    {
      id: 1,
      question: '¿Es realmente gratis usar LaPlata?',
      answer: 'Sí, LaPlata es completamente gratuito. Puedes registrar todas tus cuentas, gastos e ingresos sin ningún costo. No hay planes premium ni funciones ocultas de pago.',
      isOpen: false
    },
    {
      id: 2,
      question: '¿Necesito conectar mis cuentas bancarias?',
      answer: 'No, LaPlata funciona de manera 100% manual. Tú decides qué información agregar y cuándo. No hay conexiones automáticas con bancos, lo que garantiza tu privacidad y seguridad.',
      isOpen: false
    },
    {
      id: 3,
      question: '¿Qué tan segura es mi información financiera?',
      answer: 'Tu información está completamente segura. Al ser un sistema manual, no almacenamos credenciales bancarias ni accedemos a tus cuentas. Solo guardamos los datos que tú decides ingresar manualmente.',
      isOpen: false
    },
    {
      id: 4,
      question: '¿Puedo usar LaPlata en mi teléfono móvil?',
      answer: 'Sí, LaPlata está diseñado para funcionar perfectamente en dispositivos móviles, tablets y computadoras. La interfaz se adapta automáticamente a cualquier tamaño de pantalla.',
      isOpen: false
    },
    {
      id: 5,
      question: '¿Cómo funciona el registro manual de transacciones?',
      answer: 'Es muy simple: tú ingresas cada transacción cuando la realizas. Puedes categorizar gastos, agregar notas, y LaPlata se encarga de organizar todo en reportes y gráficos útiles.',
      isOpen: false
    },
    {
      id: 6,
      question: '¿Puedo exportar mis datos financieros?',
      answer: 'Sí, puedes exportar todos tus datos en formatos estándar como CSV o PDF. Tus datos son tuyos y siempre tendrás acceso completo a ellos.',
      isOpen: false
    },
    {
      id: 7,
      question: '¿LaPlata funciona para empresas o solo personas?',
      answer: 'LaPlata está diseñado principalmente para finanzas personales y familiares. Para uso empresarial, recomendamos consultar nuestras opciones especializadas.',
      isOpen: false
    },
    {
      id: 8,
      question: '¿Qué pasa si olvido registrar una transacción?',
      answer: 'No hay problema. Puedes agregar transacciones pasadas en cualquier momento. LaPlata te permite especificar la fecha exacta de cada movimiento para mantener tu historial preciso.',
      isOpen: false
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      // Agregar listener para mostrar/ocultar el botón de scroll
      window.addEventListener('scroll', this.handleScroll.bind(this));
      
      // Mostrar el botón inmediatamente para pruebas
      setTimeout(() => {
        const scrollToTopBtn = document.getElementById('scrollToTopBtn');
        if (scrollToTopBtn) {
          scrollToTopBtn.classList.add('show-always');
        }
      }, 100);
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      // Remover listener al destruir el componente
      window.removeEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  private handleScroll() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
      // Mostrar el botón cuando el usuario haya hecho scroll más de 100px (reducido de 300px)
      if (window.pageYOffset > 100) {
        scrollToTopBtn.classList.add('visible');
        scrollToTopBtn.classList.remove('show-always');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    }
  }

  scrollToTop() {
    if (this.isBrowser) {
      // Scroll suave hacia arriba
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      
      // Limpiar el hash de la URL para volver a la URL base
      if (window.location.hash) {
        // Usar pushState para cambiar la URL sin recargar la página
        window.history.pushState('', document.title, window.location.pathname + window.location.search);
      }
    }
  }

  // Función para alternar el estado de una pregunta FAQ
  toggleFaq(faqId: number) {
    const faq = this.faqs.find(f => f.id === faqId);
    if (faq) {
      faq.isOpen = !faq.isOpen;
    }
  }
}
