from locust import HttpUser, task, between

class SpendWiseUser(HttpUser):
    # Simula que un usuario tarda entre 1 y 3 segundos en hacer clic en otra cosa
    wait_time = between(1, 3)

    @task(2)
    def check_health(self):
        # Prueba el endpoint de salud de tu API
        self.client.get("/api/v1/expenses/health")

    @task(1)
    def read_root(self):
        # Prueba la ruta raíz
        self.client.get("/")
        
    # Aquí podríamos añadir un test que "falle" a propósito para cumplir el requisito:
    # "Perform at least 2 performance test executions: one successful and a failed one"
    @task(1)
    def failed_request(self):
        # Esta ruta no existe, así que devolverá un error 404, contando como test fallido
        self.client.get("/api/v1/ruta_inventada_para_que_falle")