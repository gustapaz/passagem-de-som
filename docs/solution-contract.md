# Contrato de integração

Modo integrado. Busca por data, capacidade e equipamento; agenda, confirmação, minhas reservas e cancelamento. O catálogo e os bloqueios de demonstração são fictícios. Reservas são escritas no SQLite/D1. Preços são ilustrativos.

- GET /api/schedule?day=AAAA-MM-DD devolve intervalos ocupados, sem identificadores privados.
- POST /api/bookings recebe id UUID v4, room, day, start e end em horas inteiras. Aceita durações de 1 a 3 horas das 10h às 22h, em São Paulo, nos próximos 14 dias incluindo hoje. Confirma com 201 ou devolve 409 se houver interseção. Reenvios do mesmo id e dados retornam 200.
- DELETE /api/bookings recebe o UUID no cabeçalho X-Booking e devolve 204. O UUID serve de comprovante de cancelamento e fica no navegador; não é listado publicamente.
- A condição de sobreposição é start existente < end solicitado e end existente > start solicitado. O SQLite avalia a condição dentro da mesma instrução de escrita. Horários contíguos podem coexistir.
- A demo é anônima, sem cartão, dados pessoais, e-mail ou pagamentos. Os horários são compartilhados por visitantes, e registros passados são limpos em novas reservas.

O [Airbnb](https://www.airbnb.com/) serviu de referência para combinar data, espaço e capacidade antes de reservar. A agenda em régua e a identidade visual são próprias. O stack interno da referência não foi assumido. O projeto usa Preact, Worker HTTP e D1, com Node 24 e SQLite local.
