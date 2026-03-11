package cmds

import (
	"context"
	"fmt"
	"os"

	"github.com/soumen-basu/pay-me-back/internal/cli/client"
	"github.com/spf13/cobra"
)

var (
	email    string
	password string
)

func init() {
	loginCmd.Flags().StringVarP(&email, "email", "e", "", "Email address")
	loginCmd.Flags().StringVarP(&password, "password", "p", "", "Password")
	loginCmd.MarkFlagRequired("email")
	loginCmd.MarkFlagRequired("password")

	rootCmd.AddCommand(authCmd)
	authCmd.AddCommand(loginCmd)
}

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authentication commands",
}

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Login to PayMeBack API",
	Long:  `Authenticate with the backend to receive a Bearer token.`,
	Run: func(cmd *cobra.Command, args []string) {
		c, err := client.NewClientWithResponses("http://localhost:8000")
		if err != nil {
			fmt.Println("Error creating client:", err)
			os.Exit(1)
		}

		ctx := context.Background()

		formData := client.LoginAccessTokenApiV1AuthAccessTokenPostFormdataRequestBody{
			Username: email,
			Password: password,
		}

		resp, err := c.LoginAccessTokenApiV1AuthAccessTokenPostWithFormdataBodyWithResponse(ctx, formData)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if resp.JSON200 != nil {
			tokenMap, ok := (*resp.JSON200).(map[string]interface{})
			if ok && tokenMap["access_token"] != nil {
				fmt.Println("Login Successful!")
				fmt.Printf("Token: %v\n", tokenMap["access_token"])
				fmt.Println("Run subsequent commands by providing this token via --token")
			} else {
				fmt.Println("Login Successful! But couldn't parse access_token from response")
			}
		} else {
			fmt.Printf("Login Failed. Status Code: %d\n", resp.StatusCode())
		}
	},
}
