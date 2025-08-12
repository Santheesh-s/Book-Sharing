package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string             `bson:"username" json:"username"`
	Password string             `bson:"password" json:"password"`
	Phone    string             `bson:"phone" json:"phone"`
}

type Book struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Author      string             `bson:"author" json:"author"`
	Description string             `bson:"description" json:"description"`
	ForSale     bool               `bson:"forSale" json:"forSale"`
	Price       float64            `bson:"price" json:"price"`
	OwnerID     primitive.ObjectID `bson:"ownerId" json:"ownerId"`
	Available   bool               `bson:"available" json:"available"`
	OwnerPhone  string             `bson:"-" json:"ownerPhone,omitempty"`
}

type Review struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BookID  primitive.ObjectID `bson:"bookId" json:"bookId"`
	UserID  primitive.ObjectID `bson:"userId" json:"userId"`
	Rating  int                `bson:"rating" json:"rating"`
	Comment string             `bson:"comment" json:"comment"`
}

type BorrowRequest struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BookID     primitive.ObjectID `bson:"bookId" json:"bookId"`
	BorrowerID primitive.ObjectID `bson:"borrowerId" json:"borrowerId"`
	Status     string             `bson:"status" json:"status"`
}

var client *mongo.Client
var db *mongo.Database

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Connect to MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable is required")
	}

	client, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("MongoDB connection error:", err)
	}

	db = client.Database("booksharing")
	log.Println("MongoDB connected")

	// Setup Gin
	r := gin.Default()

	// CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "http://localhost:5173"}
	config.AllowCredentials = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Session middleware
	store := cookie.NewStore([]byte("book-sharing-secret"))
	store.Options(sessions.Options{
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
	})
	r.Use(sessions.Sessions("session", store))

	// Routes
	setupRoutes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running at http://localhost:%s", port)
	r.Run(":" + port)
}

func setupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Auth routes
		api.POST("/register", registerHandler)
		api.POST("/login", loginHandler)
		api.POST("/logout", logoutHandler)
		api.GET("/user", getUserHandler)
		api.GET("/user-stats", getUserStatsHandler)

		// Book routes
		api.GET("/books", getBooksHandler)
		api.POST("/books", requireAuth(), createBookHandler)
		api.POST("/books/:id/available", requireAuth(), makeBookAvailableHandler)

		// Search
		api.GET("/search", searchBooksHandler)

		// Borrow/Purchase
		api.POST("/borrow/:id", requireAuth(), borrowBookHandler)
		api.POST("/purchase/:id", requireAuth(), purchaseBookHandler)
		api.POST("/return/:id", requireAuth(), returnBookHandler)

		// Reviews
		api.POST("/reviews/:id", requireAuth(), createReviewHandler)
		api.GET("/reviews/:id", getReviewsHandler)
	}

	// Serve React app
	r.Static("/static", "./frontend/dist/assets")
	r.StaticFile("/", "./frontend/dist/index.html")
	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend/dist/index.html")
	})
}

func requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userID := session.Get("userId")
		if userID == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		c.Set("userId", userID)
		c.Next()
	}
}

func registerHandler(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Phone    string `json:"phone" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if username exists
	var existingUser User
	err := db.Collection("users").FindOne(context.TODO(), bson.M{"username": req.Username}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		return
	}

	// Validate password strength
	if !isStrongPassword(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters long and include uppercase, lowercase, and a number"})
		return
	}

	// Validate phone number
	if !isValidPhone(req.Phone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter a valid 10-digit phone number"})
		return
	}

	user := User{
		Username: req.Username,
		Password: req.Password, // In production, hash the password
		Phone:    req.Phone,
	}

	result, err := db.Collection("users").InsertOne(context.TODO(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": result.InsertedID, "message": "User created successfully"})
}

func loginHandler(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	err := db.Collection("users").FindOne(context.TODO(), bson.M{
		"username": req.Username,
		"password": req.Password,
	}).Decode(&user)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	session := sessions.Default(c)
	session.Set("userId", user.ID.Hex())
	session.Save()

	c.JSON(http.StatusOK, gin.H{
		"message":  "Login successful",
		"username": user.Username,
		"userId":   user.ID.Hex(),
	})
}

func logoutHandler(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	session.Save()
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

func getUserHandler(c *gin.Context) {
	session := sessions.Default(c)
	userIDStr := session.Get("userId")

	if userIDStr == nil {
		c.JSON(http.StatusOK, gin.H{"loggedIn": false})
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"loggedIn": false})
		return
	}

	var user User
	err = db.Collection("users").FindOne(context.TODO(), bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"loggedIn": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"loggedIn": true,
		"username": user.Username,
		"userId":   user.ID.Hex(),
	})
}

func getUserStatsHandler(c *gin.Context) {
	session := sessions.Default(c)
	userIDStr := session.Get("userId")

	if userIDStr == nil {
		c.JSON(http.StatusOK, gin.H{
			"booksListed":   0,
			"booksBorrowed": 0,
			"booksSold":     0,
			"reviewsGiven":  0,
		})
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	booksListed, _ := db.Collection("books").CountDocuments(context.TODO(), bson.M{"ownerId": userID})
	booksBorrowed, _ := db.Collection("borrowrequests").CountDocuments(context.TODO(), bson.M{"borrowerId": userID})
	booksSold, _ := db.Collection("books").CountDocuments(context.TODO(), bson.M{"ownerId": userID, "forSale": true, "available": false})
	reviewsGiven, _ := db.Collection("reviews").CountDocuments(context.TODO(), bson.M{"userId": userID})

	c.JSON(http.StatusOK, gin.H{
		"booksListed":   booksListed,
		"booksBorrowed": booksBorrowed,
		"booksSold":     booksSold,
		"reviewsGiven":  reviewsGiven,
	})
}

func getBooksHandler(c *gin.Context) {
	cursor, err := db.Collection("books").Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch books"})
		return
	}
	defer cursor.Close(context.TODO())

	var books []Book
	if err = cursor.All(context.TODO(), &books); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode books"})
		return
	}

	// Fetch owner phone numbers
	for i := range books {
		var user User
		err := db.Collection("users").FindOne(context.TODO(), bson.M{"_id": books[i].OwnerID}).Decode(&user)
		if err == nil {
			books[i].OwnerPhone = user.Phone
		}
	}

	c.JSON(http.StatusOK, books)
}

func createBookHandler(c *gin.Context) {
	var req struct {
		Title       string  `json:"title" binding:"required"`
		Author      string  `json:"author" binding:"required"`
		Description string  `json:"description"`
		ForSale     bool    `json:"forSale"`
		Price       float64 `json:"price"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr := c.GetString("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	book := Book{
		Title:       req.Title,
		Author:      req.Author,
		Description: req.Description,
		ForSale:     req.ForSale,
		Price:       req.Price,
		OwnerID:     userID,
		Available:   true,
	}

	result, err := db.Collection("books").InsertOne(context.TODO(), book)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create book"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": result.InsertedID, "message": "Book created successfully"})
}

func searchBooksHandler(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	filter := bson.M{
		"$or": []bson.M{
			{"title": bson.M{"$regex": query, "$options": "i"}},
			{"author": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	cursor, err := db.Collection("books").Find(context.TODO(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search books"})
		return
	}
	defer cursor.Close(context.TODO())

	var books []Book
	if err = cursor.All(context.TODO(), &books); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode books"})
		return
	}

	c.JSON(http.StatusOK, books)
}

func borrowBookHandler(c *gin.Context) {
	bookIDStr := c.Param("id")
	bookID, err := primitive.ObjectIDFromHex(bookIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	userIDStr := c.GetString("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var book Book
	err = db.Collection("books").FindOne(context.TODO(), bson.M{"_id": bookID}).Decode(&book)
	if err != nil || !book.Available {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Book not available"})
		return
	}

	borrowRequest := BorrowRequest{
		BookID:     bookID,
		BorrowerID: userID,
		Status:     "pending",
	}

	_, err = db.Collection("borrowrequests").InsertOne(context.TODO(), borrowRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create borrow request"})
		return
	}

	_, err = db.Collection("books").UpdateOne(
		context.TODO(),
		bson.M{"_id": bookID},
		bson.M{"$set": bson.M{"available": false}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book availability"})
		return
	}

	// Get owner phone
	var owner User
	db.Collection("users").FindOne(context.TODO(), bson.M{"_id": book.OwnerID}).Decode(&owner)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Borrow request submitted",
		"ownerPhone": owner.Phone,
	})
}

func purchaseBookHandler(c *gin.Context) {
	bookIDStr := c.Param("id")
	bookID, err := primitive.ObjectIDFromHex(bookIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	var book Book
	err = db.Collection("books").FindOne(context.TODO(), bson.M{"_id": bookID}).Decode(&book)
	if err != nil || !book.Available || !book.ForSale {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Book not available for sale"})
		return
	}

	_, err = db.Collection("books").UpdateOne(
		context.TODO(),
		bson.M{"_id": bookID},
		bson.M{"$set": bson.M{"available": false}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book availability"})
		return
	}

	// Get owner phone
	var owner User
	db.Collection("users").FindOne(context.TODO(), bson.M{"_id": book.OwnerID}).Decode(&owner)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Purchase request submitted",
		"ownerPhone": owner.Phone,
	})
}

func returnBookHandler(c *gin.Context) {
	bookIDStr := c.Param("id")
	bookID, err := primitive.ObjectIDFromHex(bookIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	userIDStr := c.GetString("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	filter := bson.M{
		"bookId":     bookID,
		"borrowerId": userID,
		"status":     "pending",
	}

	update := bson.M{"$set": bson.M{"status": "returned"}}
	result, err := db.Collection("borrowrequests").UpdateOne(context.TODO(), filter, update)
	if err != nil || result.MatchedCount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active borrow found"})
		return
	}

	_, err = db.Collection("books").UpdateOne(
		context.TODO(),
		bson.M{"_id": bookID},
		bson.M{"$set": bson.M{"available": true}},
	)

	c.JSON(http.StatusOK, gin.H{"message": "Book returned successfully"})
}

func makeBookAvailableHandler(c *gin.Context) {
	bookIDStr := c.Param("id")
	bookID, err := primitive.ObjectIDFromHex(bookIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	userIDStr := c.GetString("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var book Book
	err = db.Collection("books").FindOne(context.TODO(), bson.M{"_id": bookID}).Decode(&book)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

	if book.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	// Delete all borrow requests for this book
	_, err = db.Collection("borrowrequests").DeleteMany(context.TODO(), bson.M{"bookId": bookID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete borrow requests"})
		return
	}

	// Set book as available
	_, err = db.Collection("books").UpdateOne(
		context.TODO(),
		bson.M{"_id": bookID},
		bson.M{"$set": bson.M{"available": true}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book availability"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Book is now available"})
}

func createReviewHandler(c *gin.Context) {
	bookIDStr := c.Param("id")
	bookID, err := primitive.ObjectIDFromHex(bookIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	userIDStr := c.GetString("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review := Review{
		BookID:  bookID,
		UserID:  userID,
		Rating:  req.Rating,
		Comment: req.Comment,
	}

	result, err := db.Collection("reviews").InsertOne(context.TODO(), review)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": result.InsertedID, "message": "Review created successfully"})
}

func getReviewsHandler(c *gin.Context) {
	bookIDStr := c.Param("id")
	bookID, err := primitive.ObjectIDFromHex(bookIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	cursor, err := db.Collection("reviews").Find(context.TODO(), bson.M{"bookId": bookID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}
	defer cursor.Close(context.TODO())

	var reviews []Review
	if err = cursor.All(context.TODO(), &reviews); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"})
		return
	}

	c.JSON(http.StatusOK, reviews)
}

func isStrongPassword(password string) bool {
	if len(password) < 8 {
		return false
	}
	hasUpper := false
	hasLower := false
	hasDigit := false
	for _, char := range password {
		if char >= 'A' && char <= 'Z' {
			hasUpper = true
		} else if char >= 'a' && char <= 'z' {
			hasLower = true
		} else if char >= '0' && char <= '9' {
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
}

func isValidPhone(phone string) bool {
	if len(phone) != 10 {
		return false
	}
	for _, char := range phone {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}
