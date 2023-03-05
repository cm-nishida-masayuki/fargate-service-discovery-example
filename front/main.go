package main

import (
	"io/ioutil"
	"net/http"

	"github.com/labstack/echo/v4"
)

func main() {

	e := echo.New()
	e.GET("/", func(c echo.Context) error {
		resp, err := http.Get("http://fsde-back.local:1235")

		if (err != nil){
			e.Logger.Error(err)
			return err
		}

		defer resp.Body.Close()

		body, err := ioutil.ReadAll(resp.Body)
		if (err != nil){
			return err
		}

		if resp.StatusCode != 200 {
			return c.String(http.StatusInternalServerError, "front: " + string(body))
		} else {
			return c.String(http.StatusOK, "front: " + string(body))
		}

	})

	e.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})

	e.GET("/error", func(c echo.Context) error {
		resp, err := http.Get("http://fsde-back.local:1235/error")

		if (err != nil){
			return err
		}

		defer resp.Body.Close()

		body, err := ioutil.ReadAll(resp.Body)
		if (err != nil){
			return err
		}

		return c.String(http.StatusOK, "front: " + string(body))
	})

	e.Logger.Fatal(e.Start(":1234"))
}
