//main
package main
//imports
import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"time"
	"encoding/json"
    "fmt"
	"io/ioutil"
	"path"
	"path/filepath"
	"sync"
	"strconv"
	"strings"

	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/labstack/gommon/log"
	"github.com/joho/godotenv"
	"github.com/go-playground/validator"
	//"golang.org/x/net/websocket"
	"gopkg.in/olahol/melody.v1"
	//"github.com/gorilla/websocket"
	//"golang.org/x/crypto/acme/autocert"
)

//data schemas
type (

	InfoData struct {
		DERP string `json:"DERP"`
	}

	ResponseMessage struct {
		Message string `json:"message"`
		Success bool   `json:"success"`
	}

	CustomValidator struct {
		validator *validator.Validate
	}

	//holds all env file data
	Config struct {
		PORT string
		INFO_FILENAME string
	}

	GopherInfo struct {
		ID, X, Y string
	}
)

var (
	infoData = map[string]InfoData(nil)
	config = new(Config)
)

/*
var connectionPool = struct {
    sync.RWMutex
    connections map[*websocket.Conn]struct{}
}{
    connections: make(map[*websocket.Conn]struct{}),
}
*/

// custom validator for sms body
func (cv *CustomValidator) Validate(i interface{}) error {
	return cv.validator.Struct(i)
}

//----------
// Handlers
//----------
/*
func handle_ws(c *echo.Context) (err error) {
	websocket.Handler(func(ws *websocket.Conn) {

		connectionPool.Lock()
		connectionPool.connections[ws] = struct{}{}

		defer func(connection *websocket.Conn){
			connectionPool.Lock()
			delete(connectionPool.connections, connection)
			connectionPool.Unlock()
		}(ws)

		connectionPool.Unlock()

		msg := ""

		for {
			if err = websocket.Message.Receive(ws, &msg); err != nil {
				return err
			}
			err = sendMessageToAllPool(msg)
			if err != nil {
				return err
			}
			fmt.Println(msg)
		}
	}).ServeHTTP(c.Response(), c.Request())
	return err
}
*/

//----------
// Utils
//----------

func getDataPath() string {
	fp, _ := filepath.Abs("./app/data/")
	return fp
}

// return env var values if they exist else fallback
func getEnv(key, fallback string) string {
    if value, ok := os.LookupEnv(key); ok {
        return value
    }
    return fallback
}

//-----------
// Methods
//-----------
func populateInfo() map[string]InfoData {
	// we initialize our provider data
	var info map[string]InfoData
	fp := path.Join( getDataPath(), config.INFO_FILENAME)
	log.Info("opening: " + fp)
	jsonFile, err := os.Open(fp)
	// if we os.Open returns an error then handle it
	if err != nil {
		log.Error(err)
		return info
	}
	fmt.Println("Successfully Opened "+ config.INFO_FILENAME)
	// defer the closing of our jsonFile so that we can parse it later on
	defer jsonFile.Close()
	// read our opened file as a byte array.
	byteValue, _ := ioutil.ReadAll(jsonFile)

	// we unmarshal our byteArray which contains our
	// jsonFile's content into data which we defined above
	json.Unmarshal(byteValue, &info)
    fmt.Println(info)
	return info
}

/*
func sendMessageToAllPool(message string) error {
    connectionPool.RLock()
    defer connectionPool.RUnlock()
    for connection := range connectionPool.connections {
        if err := websocket.Message.Send(connection, message); err != nil {
            return err
        }
    }
    return nil
}
*/

func setup() {
	if _, ok := os.LookupEnv("EMAIL"); ok {
		log.Info("found env vars")
	}else{
		//load config from .env if not set
		log.Info("loading from .env file")
		err := godotenv.Load()
		if err != nil {
			log.Fatal("Error loading .env file")
		}
	}
	// set config from env
	config.PORT = getEnv("PORT", "443")
	config.INFO_FILENAME = getEnv("INFO_FILENAME", "info.json")

	//loda data
	infoData = populateInfo()
	log.Info("known providers: ", infoData)
}


func main() {
	//setup any config
	setup()
	
	// instansiate echo server
	e := echo.New()
	m := melody.New()

	gophers := make(map[*melody.Session]*GopherInfo)
	lock := new(sync.Mutex)
	counter := 0

	e.Logger.SetLevel(log.INFO)
	// Debug mode
	e.Debug = true
	// e.AutoTLSManager.HostPolicy = autocert.HostWhitelist("<DOMAIN>")
	// Cache certificates
	// e.AutoTLSManager.Cache = autocert.DirCache("/var/www/.cache")
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{http.MethodGet, http.MethodPost},
		//AllowHeaders: []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete},
	}))

	e.Validator = &CustomValidator{validator: validator.New()}

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.HTML(http.StatusOK, `
			<h1>Welcome to Echo!</h1>
			<h3>TLS certificates automatically installed from Let's Encrypt :)</h3>
		`)
	})

	// Websocket
	e.GET("/ws", func(c echo.Context) error {
		m.HandleRequest(c.Response(), c.Request())
		return nil
	})

	m.HandleConnect(func(s *melody.Session) {
		lock.Lock()
		for _, info := range gophers {
			s.Write([]byte("set " + info.ID + " " + info.X + " " + info.Y))
		}
		gophers[s] = &GopherInfo{strconv.Itoa(counter), "0", "0"}
		s.Write([]byte("iam " + gophers[s].ID))
		counter += 1
		lock.Unlock()
	})

	m.HandleDisconnect(func(s *melody.Session) {
		lock.Lock()
		m.BroadcastOthers([]byte("dis "+gophers[s].ID), s)
		delete(gophers, s)
		lock.Unlock()
	})

	m.HandleMessage(func(s *melody.Session, msg []byte) {
		p := strings.Split(string(msg), " ")
		lock.Lock()
		info := gophers[s]
		if len(p) == 2 {
			info.X = p[0]
			info.Y = p[1]
			m.BroadcastOthers([]byte("set "+info.ID+" "+info.X+" "+info.Y), s)
		}
		lock.Unlock()
	})

	// Start server
	go func() {
		if err := e.Start(":"+ config.PORT); err != nil {
			e.Logger.Info("shutting down the server")
		}
		/*
		if err := e.StartAutoTLS(":"+ config.PORT); err != nil {
			e.Logger.Info("shutting down the server")
		}
		*/
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 10 seconds.
	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
}
