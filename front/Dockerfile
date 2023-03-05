FROM --platform=linux/amd64 golang:1.19.4-buster AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY main.go ./

RUN GOARCH=amd64 GOOS=linux go build -o /front

FROM gcr.io/distroless/base-debian10

WORKDIR /

COPY --from=builder /front /front

EXPOSE 1234

USER nonroot:nonroot

ENTRYPOINT [ "/front" ]
