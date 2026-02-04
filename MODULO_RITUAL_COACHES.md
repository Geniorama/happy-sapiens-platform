# Módulo Ritual Coaches

Este módulo permite a los usuarios agendar citas con profesionales (coaches) de Happy Sapiens y gestionar sus reservas.

## Estructura de Base de Datos

### Tablas

1. **users** (extendida): Los coaches son usuarios con `role='coach'`
   - Campos agregados a la tabla users:
     - `role`: Rol del usuario ('user' o 'coach')
     - `bio`: Biografía del coach
     - `specialization`: Especialización (Nutrición, Entrenamiento, Bienestar Mental, etc.)
     - `phone`: Teléfono de contacto
     - `is_coach_active`: Si el coach está activo (solo para coaches)

2. **coach_availability**: Horarios disponibles de cada coach
   - `coach_id`: Referencia al usuario con role='coach'
   - `day_of_week`: Día de la semana (0=Domingo, 6=Sábado)
   - `start_time`: Hora de inicio
   - `end_time`: Hora de fin
   - `is_available`: Si está disponible

3. **appointments**: Citas agendadas
   - `user_id`: Usuario que agendó (role='user')
   - `coach_id`: Coach asignado (usuario con role='coach')
   - `appointment_date`: Fecha de la cita
   - `appointment_time`: Hora de la cita
   - `duration_minutes`: Duración en minutos (default: 60)
   - `status`: Estado (scheduled, completed, cancelled, no_show)
   - `notes`: Notas adicionales

4. **user_health_profiles**: Perfil de salud del usuario (requerido para agendar citas)
   - `user_id`: Referencia al usuario (único)
   - `weight`: Peso en kg
   - `height`: Altura en cm
   - `age`: Edad
   - `gender`: Género
   - `diseases`: Enfermedades o condiciones médicas
   - `medications`: Medicamentos actuales
   - `allergies`: Alergias
   - `objectives`: Objetivos del usuario
   - `activity_level`: Nivel de actividad física
   - `current_exercise_routine`: Rutina de ejercicio actual
   - `previous_injuries`: Lesiones previas
   - `dietary_restrictions`: Restricciones dietéticas
   - `additional_notes`: Notas adicionales

## Instalación

1. Ejecutar las migraciones SQL en Supabase (en este orden):
   ```sql
   -- 1. Primero ejecutar: supabase-migration-ritual-coaches.sql
   -- 2. Luego ejecutar: supabase-migration-user-health-profile.sql
   -- 3. Opcional: supabase-migration-ritual-coaches-trigger.sql (para validación adicional)
   ```

2. La migración incluye:
   - Agregar campos a la tabla `users` (role, bio, specialization, phone, is_coach_active)
   - Creación de tablas (coach_availability, appointments)
   - Índices para rendimiento
   - Políticas RLS (Row Level Security)
   - Constraint para validar que coach_id sea un usuario con role='coach'

### Crear un Coach

Para crear un coach, actualiza un usuario existente o crea uno nuevo con `role='coach'`:

```sql
-- Opción 1: Actualizar usuario existente
UPDATE users 
SET 
  role = 'coach',
  bio = 'Biografía del coach',
  specialization = 'Nutrición',
  phone = '+34 600 123 456',
  is_coach_active = true
WHERE email = 'coach@example.com';

-- Opción 2: Crear nuevo usuario como coach
INSERT INTO users (name, email, role, bio, specialization, phone, is_coach_active)
VALUES (
  'María González',
  'maria.gonzalez@happysapiens.com',
  'coach',
  'Especialista en nutrición deportiva...',
  'Nutrición',
  '+34 600 123 456',
  true
);
```

## Funcionalidades

### Para Usuarios

1. **Listado de Coaches** (`/dashboard/coaches`)
   - Ver todos los coaches activos
   - Filtrar por especialización
   - Ver próximas citas agendadas
   - Navegar al detalle de cada coach

2. **Detalle del Coach** (`/dashboard/coaches/[id]`)
   - Ver información completa del coach
   - Ver disponibilidad
   - Agendar nueva cita
   - Seleccionar fecha y hora disponible

3. **Gestión de Citas** (`/dashboard/coaches/appointments`)
   - Ver todas las citas (programadas, completadas, canceladas)
   - Cancelar citas programadas
   - Ver detalles de cada cita

### Características

- ✅ Validación de disponibilidad en tiempo real
- ✅ Prevención de doble reserva
- ✅ Validación de fechas pasadas
- ✅ Interfaz responsive para móviles
- ✅ Filtros por especialización
- ✅ Gestión completa de reservas

## Uso

### Completar Perfil de Salud

**IMPORTANTE**: Antes de agendar una cita, debes completar tu perfil de salud.

1. Ir a `/dashboard/profile` o intentar agendar una cita
2. Completar el formulario de perfil de salud con:
   - Datos físicos (peso, talla, edad, género) - **Requeridos**
   - Información médica (enfermedades, medicamentos, alergias)
   - Objetivos - **Requerido**
   - Nivel de actividad y rutina de ejercicio
   - Información adicional
3. Guardar el perfil

### Agendar una Cita

1. Ir a `/dashboard/coaches`
2. Seleccionar un coach
3. Si no tienes perfil de salud completo, se mostrará el formulario primero
4. Una vez completado el perfil, seleccionar fecha disponible
5. Seleccionar hora disponible
6. Agregar notas opcionales
7. Confirmar la cita

### Cancelar una Cita

1. Ir a `/dashboard/coaches/appointments`
2. Encontrar la cita programada
3. Hacer clic en "Cancelar Cita"
4. Confirmar la cancelación

## Archivos Creados

- `supabase-migration-ritual-coaches.sql`: Migración principal de coaches
- `supabase-migration-user-health-profile.sql`: Migración de perfil de salud
- `supabase-migration-ritual-coaches-trigger.sql`: Trigger de validación (opcional)
- `create-coach-example.sql`: Script para crear coaches de ejemplo
- `src/app/dashboard/coaches/page.tsx`: Página principal de coaches
- `src/app/dashboard/coaches/[id]/page.tsx`: Página de detalle del coach
- `src/app/dashboard/coaches/appointments/page.tsx`: Página de gestión de citas
- `src/app/dashboard/coaches/actions.ts`: Acciones del servidor
- `src/components/dashboard/coaches-list.tsx`: Componente de listado
- `src/components/dashboard/coach-detail.tsx`: Componente de detalle
- `src/components/dashboard/user-appointments.tsx`: Componente de gestión
- `src/components/dashboard/health-profile-form.tsx`: Formulario de perfil de salud

## Notas

- **Requisito obligatorio**: Los usuarios deben completar su perfil de salud antes de agendar citas
- Las citas tienen una duración predeterminada de 60 minutos
- Solo se pueden cancelar citas programadas y futuras
- El sistema valida automáticamente la disponibilidad del coach
- Los horarios disponibles se calculan basándose en la disponibilidad configurada
- El perfil de salud se puede actualizar en cualquier momento desde `/dashboard/profile`
- Los campos requeridos del perfil de salud son: peso, talla, edad, género y objetivos
