package cmds

import (
	"context"
	"fmt"
	"os"

	"github.com/oapi-codegen/runtime/types"
	"github.com/soumen-basu/PayMeBack/internal/cli/client"
	"github.com/spf13/cobra"
)

var (
	email      string
	password   string
	magicToken string
)

func init() {
	loginCmd.Flags().StringVarP(&email, "email", "e", "", "Email address")
	loginCmd.Flags().StringVarP(&password, "password", "p", "", "Password")
	loginCmd.MarkFlagRequired("email")
	loginCmd.MarkFlagRequired("password")

	magicLinkCmd.Flags().StringVarP(&email, "email", "e", "", "Email address")
	magicLinkCmd.MarkFlagRequired("email")

	verifyCmd.Flags().StringVarP(&email, "email", "e", "", "Email address")
	verifyCmd.Flags().StringVarP(&magicToken, "token", "k", "", "Magic link token")
	verifyCmd.MarkFlagRequired("email")
	verifyCmd.MarkFlagRequired("token")

	rootCmd.AddCommand(authCmd)
	authCmd.AddCommand(loginCmd)
	authCmd.AddCommand(magicLinkCmd)
	authCmd.AddCommand(verifyCmd)
}

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authentication commands",
}

func getClient() *client.ClientWithResponses {
	c, err := client.NewClientWithResponses("http://localhost:8000")
	if err != nil {
		fmt.Println("Error creating client:", err)
		os.Exit(1)
	}
	return c
}

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Login to PayMeBack API using password",
	Run: func(cmd *cobra.Command, args []string) {
		c := getClient()
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
				accessToken := fmt.Sprintf("%v", tokenMap["access_token"])
				fmt.Println("Login Successful!")
				err := saveToken(accessToken)
				if err == nil {
					fmt.Printf("Token saved to %s\n", tokenFile)
				} else {
					fmt.Printf("Token: %s\n", accessToken)
				}
			} else {
				fmt.Println("Login Successful! But couldn't parse access_token from response")
			}
		} else {
			fmt.Printf("Login Failed. Status Code: %d\n", resp.StatusCode())
		}
	},
}

var magicLinkCmd = &cobra.Command{
	Use:   "magic-link",
	Short: "Request a magic link for login",
	Run: func(cmd *cobra.Command, args []string) {
		c := getClient()
		ctx := context.Background()

		body := client.RequestMagicLinkApiV1AuthMagicLinkPostJSONRequestBody{
			Email: types.Email(email),
		}

		resp, err := c.RequestMagicLinkApiV1AuthMagicLinkPostWithResponse(ctx, body)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if resp.StatusCode() == 200 {
			fmt.Println("Magic link requested successfully. Check your email (or logs in dev).")
		} else {
			fmt.Printf("Failed to request magic link. Status Code: %d\n", resp.StatusCode())
		}
	},
}

var verifyCmd = &cobra.Command{
	Use:   "verify",
	Short: "Verify magic link token and get access token",
	Run: func(cmd *cobra.Command, args []string) {
		c := getClient()
		ctx := context.Background()

		params := &client.VerifyMagicLinkApiV1AuthVerifyGetParams{
			Email: email,
			Token: magicToken,
		}

		resp, err := c.VerifyMagicLinkApiV1AuthVerifyGetWithResponse(ctx, params)
		if err != nil {
			fmt.Println("Request Failed:", err)
			os.Exit(1)
		}

		if resp.JSON200 != nil {
			tokenMap, ok := (*resp.JSON200).(map[string]interface{})
			if ok && tokenMap["access_token"] != nil {
				accessToken := fmt.Sprintf("%v", tokenMap["access_token"])
				fmt.Println("Verification Successful!")
				err := saveToken(accessToken)
				if err == nil {
					fmt.Printf("Token saved to %s\n", tokenFile)
				} else {
					fmt.Printf("Token: %s\n", accessToken)
				}
			} else {
				fmt.Println("Verification Successful! But couldn't parse access_token from response")
			}
		} else {
			fmt.Printf("Verification Failed. Status Code: %d\n", resp.StatusCode())
		}
	},
}
