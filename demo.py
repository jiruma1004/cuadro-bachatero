"""Genera una sesión sintética sin depender de una canción comercial."""
from backend.app import demo
p=demo()
print(f'Demo creada: {p.project_id}. Inicia la aplicación y selecciónala en sesiones guardadas.')
