package cmds

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	token     string
	tokenFile string
)

var rootCmd = &cobra.Command{
	Use:   "PayMeBack-cli",
	Short: "A CLI tool for interacting with the PayMeBack API",
	Long:  `A command line interface for managing PayMeBack backend services easily.`,
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&token, "token", "T", "", "Bearer token for authentication (overrides --token-file)")
	rootCmd.PersistentFlags().StringVarP(&tokenFile, "token-file", "t", "token.txt", "File to read/write the auth token")
}

// Execute is called by main.main().
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func getEffectiveToken() string {
	if token != "" {
		return token
	}
	if tokenFile != "" {
		data, err := os.ReadFile(tokenFile)
		if err == nil {
			return string(data)
		}
	}
	return ""
}

func saveToken(t string) error {
	if tokenFile == "" {
		return nil
	}
	return os.WriteFile(tokenFile, []byte(t), 0600)
}
